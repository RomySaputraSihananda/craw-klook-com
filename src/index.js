import * as cheerio from "cheerio";
import fs from "fs-extra";
import fetch from "node-fetch";
import strftime from "strftime";
class Klook {
  #BASE_URL = "https://www.klook.com";

  constructor() {
    this.#start();
  }

  async #start() {
    await this.#process(
      `${
        this.#BASE_URL
      }/id/activity/71541-klook-fun-pass-bangkok-pattaya-attraction`
    );
  }

  async #getCountries() {
    const req = await fetch(
      "https://www.klook.com/v1/usrcsrv/destination/guide"
    );
    const { result } = await req.json();

    return result.app_destination_guide_list[0].sub_menu_list;
  }

  async #getInfo(url) {
    const req = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/118.0",
        "Accept-Language": "en-US,en;q=0.5",
        Cookie:
          'ftr_blst_1h=1705774241359;klk_ps=1;klk_i_sn=4830454301..1705774822636;__lt__sid.c83939be=b750d8cf-7ee36b31;_ga_FW3CMDM313=GS1.1.1705774238.1.1.1705774818.0.0.0;_yjsu_yjad=1705774238.50f68494-1d07-4c6e-bd11-242bcbd35888;wcs_bt=s_2cb388a4aa34:1705774818;_tt_enable_cookie=1;_ga=GA1.1.719586536.1705774239;KSID=MQ.6da66ba4292b485a6a39258304e10809;__lt__cid=bdb2db77-41cc-4a8d-a680-2f2059194dd9;_uetvid=370ad390b7bf11ee925f113f2be3e15e;__lt__sid=b750d8cf-7ee36b31;_gid=GA1.2.1825558029.1705774239;__lt__cid.c83939be=bdb2db77-41cc-4a8d-a680-2f2059194dd9;_fwb=193Czie2qHUxgHmYQAABS4k.1705774238526;_ga_TH9DNLM4ST=GS1.1.1705774240.1.1.1705774822.54.0.0;_ga_V8S4KC8ZXR=GS1.1.1705774239.1.1.1705774819.57.0.0;_gcl_au=1.1.159200343.1705774238;_ttp=rp7bxv6M8YOPdhG30j9Strs5vB6;_uetsid=3709f820b7bf11ee9ad79f128b0ccfc3;clientside-cookie=5e948f8b0c62a43de85882b29adad4f0fe2d4972cc249779324a30b76cee6fed70b8ba9d636afba91d70bc0da9a980bc73050eee8e1ecf4296d586c3e3cbea00e8e18fe56d2d91ef05178d9fa674fa40fae1a94bddc2f8ce7103de877a272044106e316678540dfe893565ca076209f557b3d6bcc5747a5614c64d41b739b22eadff10cccde4f59021c1c6ed4147b99b7345b3db37613806e4f30f;dable_uid=43548004.1705774238944;datadome=NzwTyDCn47Ia58WgpO4jOsOuDkPRxf1hs8fRof9HHx0CNUG7s9xntrUDoEMSUWR7UrS0m9wDrGTNo5nB1PjsNvagWv5jeMciwBL4R8Ei5u18Cw5m7PGGYSkGsD4RRjO3;forterToken=704460443c3142c88fccbdef8027b651_1705774820433__UDF43-m4_13ck_;g_state={"i_p":1705781456485,"i_l":1};JSESSIONID=7081DA06282CA956DFDD095047902546;kepler_id=6b3b7eba-2481-4e63-90f4-d8263bb6c71f;klk_currency=IDR;klk_ga_sn=3368912561..1705774817877;klk_rdc=ID;KOUNT_SESSION_ID=7081DA06282CA956DFDD095047902546',
      },
    });

    const $ = cheerio.load(await req.text());

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
        headers: {
          currency: "IDR",
        },
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
              headers: {
                currency: "IDR",
              },
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
        package_list: {
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
        },
      };
    });
  }

  async #process(url) {
    const countries = await this.#getCountries();
    countries.forEach(async ({ klook_id }) => {
      // for (const { klook_id } of countries) {
      let i = 1;
      while (true) {
        try {
          const req = await fetch(
            `https://www.klook.com/v2/usrcsrv/search/country/${klook_id}/activities?start=${i}&size=25`,
            {
              headers: {
                currency: "IDR",
              },
            }
          );

          const { result } = await req.json();

          if (!result.activities) break;

          result.activities.forEach(async (activitie) => {
            // for (const activitie of result.activities) {
            try {
              if (activitie.id == 71541) {
                const { description, catatan, image } = await this.#getInfo(
                  activitie.deeplink
                );
                console.log({ description, catatan, image });
                fs.writeJSON("hehe.json", {
                  link: activitie.deeplink,
                  domain: "www.klook.com",
                  tag: activitie.deeplink
                    .replace(/\/$/, "")
                    .split("/")
                    .slice(2),
                  crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
                  crawling_time_epoch: Date.now(),
                  // path_data_raw: `data/data_raw/data_review/${"www.klook.com"}/${
                  //   activitie.title
                  // }/json/${review.reviewId}.json`,
                  // path_data_clean: `data/data_clean/data_review/${"www.klook.com"}/${
                  //   activitie.title
                  // }/json/${review.reviewId}.json`,
                  reviews_name: activitie.title,
                  description_reviews: description,
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
                          activitie.card_tags.deals_discount.match(
                            /[\d+.,]+/
                          )[0]
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
                  product_reviews: await this.#getProducts(activitie.id),
                });
              }
            } catch (e) {
              console.log(e);
              throw e;
              // console.log(activitie.card_tags.deals_discount);
            }
          });
          // }
          // break;
          i++;
        } catch (e) {
          // console.log(req.status, await req.text());
          throw e;
        }
      }
      // }
    });
  }
}

new Klook();

// const req = await fetch(
//   "https://www.klook.com/id/activity/71541-klook-fun-pass-bangkok-pattaya-attraction/",
//   {
//     headers: {
//       "User-Agent":
//         "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
//       Cookie:
//       "Accept-Language": "en-US,en;q=0.5",
//     },
//   }
// );

// fs.writeFileSync("jhjsadb.html", await req.text());
