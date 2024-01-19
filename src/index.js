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

    console.log(
      $('script[data-n-head="ssr"][type="application/ld+json"]')
        .map((_, e) => JSON.parse($(e).text()))
        .toArray()
    );
  }
}

new Klook();
