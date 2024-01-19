import fetch from "node-fetch";
import fs from "fs-extra";
import strftime from "strftime";

const req = await fetch("https://www.klook.com/v1/usrcsrv/destination/guide");
const { result } = await req.json();
const countries = result.app_destination_guide_list[0].sub_menu_list;

countries.forEach(async ({ klook_id }) => {
  let i = 1;

  while (true) {
    const e = await fetch(
      `https://www.klook.com/v2/usrcsrv/search/country/${klook_id}/activities?start=${i}&size=25`,
      {
        headers: {
          currency: "IDR",
        },
      }
    );
    const { result } = await e.json();

    if (!result.activities) break;

    result.activities.forEach(async (activitie) => {
      try {
        fs.writeFileSync(
          "test.json",
          JSON.stringify(
            {
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
                .map((key) => activitie[key]),
              category_reviews: "string",
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
            },
            null,
            2
          )
        );
      } catch (e) {
        console.log(activitie.card_tags.deals_discount);
        throw e;
      }
    });
    break;
    i++;
  }
});
