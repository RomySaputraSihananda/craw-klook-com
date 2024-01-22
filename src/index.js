import * as cheerio from "cheerio";
import fs from "fs-extra";
// import fetch from "node-fetch";
import strftime from "strftime";

const headers = {
  currency: "IDR",
};

class Klook {
  #BASE_URL = "https://www.klook.com";

  constructor() {
    this.#start();
  }

  async #writeFile(outputFile, data) {
    await fs.outputFile(outputFile, JSON.stringify(data, null, 2));
  }

  async #start() {
    await this.#process(
      `${
        this.#BASE_URL
      }/id/activity/71541-klook-fun-pass-bangkok-pattaya-attraction`
    );
  }

  async #getCountries() {
    const response = await fetch(
      `${this.#BASE_URL}/v1/usrcsrv/destination/guide`
    );
    const { result } = await response.json();

    return result.app_destination_guide_list[0].sub_menu_list;
  }

  async #getInfo(url) {
    const response = await fetch(url, {
      headers,
    });

    const $ = cheerio.load(await response.text());

    const { description, image } = JSON.parse(
      $('script[data-n-head="ssr"][type="application/ld+json"]').eq(2).text()
    );

    const { contentUrl: video } = JSON.parse(
      $('script[data-n-head="ssr"][type="application/ld+json"]').first().text()
    );

    const catatan = Object.fromEntries(
      $("#Good_to_know .klk-markdown.klk-markdown--highlight")
        .map((_, div) => {
          return [
            [
              $(div).find("h4").text(),
              $(div)
                .find("ul li")
                .map((_, li) => {
                  return $(li).text();
                })
                .get(),
            ],
          ];
        })
        .get()
    );

    return { description, catatan, image: [video, ...image] };
  }

  async #getProducts(klook_id) {
    const response = await fetch(
      `${
        this.#BASE_URL
      }/v1/attractionbffsrv/travelpass/pass_service/get_attraction_included_by_pass_id?` +
        new URLSearchParams({
          pass_id: klook_id,
          include_detail: false,
          language: "id",
        }),
      {
        headers,
      }
    );
    const { result } = await response.json();

    if (!result.attraction_included_list.length) return [];

    const products = await Promise.all(
      result.attraction_included_list[0].data_list.map(
        async ({ activity_id }) => {
          const response = await fetch(
            `${
              this.#BASE_URL
            }/v1/attractionbffsrv/travelpass/pass_service/get_standard_activity_detail_by_pass_id?` +
              new URLSearchParams({
                pass_activity_id: klook_id,
                standard_activity_id: activity_id,
                language: "id",
              }),
            {
              headers,
            }
          );
          const { result } = await response.json();

          return result;
        }
      )
    );
    return products.map(({ activity_name, package_list }) => {
      const pkg = package_list[0];
      return {
        activity_name,
        currency_reviews: "IDR",
        max_price: parseInt(
          pkg.max_price.replace("Rp ", "").replaceAll(",", "")
        ),
        sku_remind: pkg.sku_remind,
        sku_remind_note: pkg.sku_remind_note,
        description: pkg.render_object
          .map(({ content }) => {
            const $ = cheerio.load(content);
            try {
              const url = $(content).attr("src");

              if (!url) throw Error;

              return url;
            } catch (e) {
              return content.replace(/<[^>]*>/g, "");
            }
          })
          .join("/n"),
      };
    });
  }

  async #getReviews(activitieId) {
    const reviews = [];
    let i = 1;
    while (true) {
      const response = await fetch(
        `${
          this.#BASE_URL
        }/v1/experiencesrv/activity/component_service/activity_reviews_list?` +
          new URLSearchParams({
            activity_id: activitieId,
            page: i,
            limit: 10,
          }),
        { headers }
      );

      const { result } = await response.json();

      if (result.item) {
        console.log("kosong");
        break;
      }

      reviews.push(
        ...result.item.map((item) => {
          return {
            id: item.id,
            username_reviews: item.author,
            package_name_reviews: item.package_name,
            ticket_id_reviews: item.ticket_id,
            avatar_reviews: `https://cdn.klook.com/upload/img200X200/${item.avatar}`,
            image_reviews: item.review_image.map((image) => image.img_url),
            created_time: item.date,
            created_time_epoch: new Date(item.date).getTime(),
            email_reviews: null,
            company_name: null,
            location_reviews: null,
            title_detail_reviews: null,
            reviews_rating: item.rating / 20,
            detail_reviews_rating: null,
            total_likes_reviews: item.like_count,
            total_dislikes_reviews: null,
            total_reply_reviews: item.has_reply ? item.has_reply : 0,
            content_reviews: item.content,
            content_language: item.language,
            content_translate_reviews: item.translate_content,
            content_translate_language: item.translate_language,
            reply_content_reviews: item.reply,
            date_of_experience: strftime(
              "%Y-%m-%d %H:%M:%S",
              new Date(item.start_time)
            ),
            date_of_experience_epoch: new Date(item.start_time).getTime(),
          };
        })
      );
      i++;
    }

    return reviews;
  }

  async #process(url) {
    const countries = await this.#getCountries();
    countries.forEach(async ({ klook_id }) => {
      // for (const { klook_id } of countries) {
      let i = 1;
      while (true) {
        try {
          const response = await fetch(
            `${
              this.#BASE_URL
            }/v2/usrcsrv/search/country/${klook_id}/activities?start=${i}&size=25`,
            {
              headers,
            }
          );

          const { result } = await response.json();

          if (!result.activities) break;

          // result.activities.forEach(async (activitie) => {
          for (const activitie of result.activities) {
            try {
              const { description, catatan, image } = {
                description: null,
                catatan: null,
                image: null,
              };
              // await this.#getInfo(
              //   activitie.deeplink
              // );

              const header = {
                link: activitie.deeplink,
                domain: "www.klook.com",
                tag: activitie.deeplink.replace(/\/$/, "").split("/").slice(2),
                crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
                crawling_time_epoch: Date.now(),
                reviews_name: activitie.title,
                description_reviews: description,
                notes_reviews: catatan,
                location_reviews: {
                  ...Object.fromEntries(
                    Object.keys(activitie)
                      .filter((key) => key.endsWith("name"))
                      .map((key) => [key, activitie[key]])
                  ),
                  coordinates: Object.fromEntries(
                    activitie.latlng
                      .split(",")
                      .map((e, i) => [
                        i == 0 ? "latitude" : "longitude",
                        parseFloat(e),
                      ])
                  ),
                },
                media_reviews: Object.keys(activitie)
                  .filter(
                    (key) =>
                      key.startsWith("video") | key.startsWith("image") &&
                      activitie[key].length
                  )
                  .map((key) => activitie[key])
                  .concat(image),
                category_reviews: "travel",
                currency_reviews: activitie.currency,
                discount_reviews:
                  activitie.card_tags.deals_discount &&
                  activitie.card_tags.deals_discount.includes("%")
                    ? parseFloat(
                        activitie.card_tags.deals_discount.match(/[\d+.,]+/)[0]
                      )
                    : null,
                price_detail_reviews: Object.fromEntries(
                  Object.keys(activitie)
                    .filter(
                      (key) => key.endsWith("_price") && key !== "spec_price"
                    )
                    .map((key) => {
                      return [key, parseInt(activitie[key] | 0)];
                    })
                ),
                total_reviews: activitie.review_total,
                reviews_rating: {
                  total_rating: activitie.score,
                  detail_total_rating: null,
                },
                // product_reviews: await this.#getProducts(activitie.id),
              };

              const reviews = await this.#getReviews(activitie.id);
              if (!reviews) continue;

              try {
                reviews.forEach(async (review) => {
                  const output = `data/${activitie.title}/${review.id}.json`;
                  delete review.id;
                  console.log(output);
                  await this.#writeFile(output, {
                    ...header,
                    path_data_raw: `data/data_raw/data_review/${"www.klook.com"}/${
                      activitie.title
                    }/json/${review.id}.json`,
                    path_data_clean: `data/data_clean/data_review/${"www.klook.com"}/${
                      activitie.title
                    }/json/${review.id}.json`,
                    detail_reviews: review,
                  });
                });
              } catch (e) {
                console.error(e);
              }
              // }
            } catch (e) {
              console.error(e);
            }
            // });
          }
          // break;
          i++;
        } catch (e) {
          console.error(e);
        }
      }
      // }
    });
  }
}

new Klook();
