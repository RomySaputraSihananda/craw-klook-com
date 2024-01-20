import fetch from "node-fetch";
import * as cheerio from "cheerio";

import fs from "fs-extra";
import strftime from "strftime";

const getProducts = async (klook_id) => {
  const response = await fetch(
    `https://www.klook.com/v1/attractionbffsrv/travelpass/pass_service/get_attraction_included_by_pass_id?` +
      new URLSearchParams({
        pass_id: klook_id,
        include_detail: false,
        language: "id",
      })
  );
  const { result } = await response.json();

  if (!result.attraction_included_list.length) return [];

  const products = await Promise.all(
    result.attraction_included_list[0].data_list.map(
      async ({ activity_id }) => {
        const response = await fetch(
          `https://www.klook.com/v1/attractionbffsrv/travelpass/pass_service/get_standard_activity_detail_by_pass_id?` +
            new URLSearchParams({
              pass_activity_id: klook_id,
              standard_activity_id: activity_id,
              language: "id",
            })
        );
        const { result } = await response.json();

        return result;
      }
    )
  );
  return products.map(({ activity_name, package_list }) => {
    return {
      activity_name,
      package_list: package_list[0].render_object.map(({ content }) => {
        const $ = cheerio.load(content);
        return $(content).text() ? $(content).text() : $(content).attr("src");
      }),
    };
  });
};

const req = await fetch("https://www.klook.com/v1/usrcsrv/destination/guide");
const { result } = await req.json();
const countries = result.app_destination_guide_list[0].sub_menu_list;
countries.forEach(async ({ klook_id }) => {
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
        try {
          if (activitie.id == 71541)
            console.log({
              link: activitie.deeplink,
              domain: "www.klook.com",
              tag: activitie.deeplink.replace(/\/$/, "").split("/").slice(2),
              crawling_time: strftime("%Y-%m-%d %H:%M:%S", new Date()),
              crawling_time_epoch: Date.now(),
              // path_data_raw: `data/data_raw/data_review/${"www.klook.com"}/${
              //   activitie.title
              // }/json/${review.reviewId}.json`,
              // path_data_clean: `data/data_clean/data_review/${"www.klook.com"}/${
              //   activitie.title
              // }/json/${review.reviewId}.json`,
              reviews_name: activitie.title,
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
                .concat([]),
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
              product_reviews: await getProducts(activitie.id),
            });
        } catch (e) {
          console.log(e);
          throw e;
          // console.log(activitie.card_tags.deals_discount);
        }
      });
      // break;
      i++;
    } catch (e) {
      // console.log(req.status, await req.text());
      throw e;
    }
  }
});
