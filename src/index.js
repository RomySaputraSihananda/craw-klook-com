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
      `${this.#BASE_URL}/id/activity/800-private-car-charter-bali/`
    );
  }

  async #process(url) {
    const req = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/118.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const $ = cheerio.load(await req.text());

    const { description, image } = JSON.parse(
      $('script[data-n-head="ssr"][type="application/ld+json"]').eq(2).text()
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
  }
}

// new Klook();

const data = [
  "<strong>Safari Park</strong>",
  '<h1 class="ok">Safari Park</h1>',
  '<img class="ok" src="kasdjljas"/>',
];

data.forEach((e) => {
  const $ = cheerio.load(e);
  console.log($(e).text() ? $(e).text() : $(e).attr("src"));
});
