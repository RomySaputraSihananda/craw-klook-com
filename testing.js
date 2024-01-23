import * as cheerio from "cheerio";
import fs from "fs-extra";
import puppeteer from "puppeteer";
// import fetch from "node-fetch";
import strftime from "strftime";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",
  currency: "IDR",
};

class Klook {
  #BASE_URL = "https://www.klook.com";

  constructor() {
    this.#start();
    this.page = null;
  }

  async #start() {
    const browser = await puppeteer.launch({ headless: false });
    this.page = await browser.newPage();
    this.page.setCookie();

    // const countries = await this.#getCountries();
    // countries.forEach(async ({ klook_id }) => {
    let i = 1;
    // while (true) {
    // try {
    // const response = await fetch(
    //   `${
    //     this.#BASE_URL
    //   }/v2/usrcsrv/search/country/${klook_id}/activities?start=${i}&size=25`,
    //   {
    //     headers,
    //   }
    // );

    // const { result } = await response.json();

    // if (!result.activities) break;
    // result.activities.forEach(async (activitie) => {
    await this.#process("https://www.klook.com/");
    //   });
    // } catch (e) {}
    // }
    // });
  }

  async #getCountries() {
    const response = await fetch(
      `${this.#BASE_URL}/v1/usrcsrv/destination/guide`
    );
    const { result } = await response.json();

    return result.app_destination_guide_list[0].sub_menu_list;
  }

  async #process(url) {
    this.page.on("respone", async (response) => {
      if (
        response.url().include(this.#BASE_URL) &&
        response.headers()["content-type"].include("application/json")
      ) {
        console.log(await response.json());
      }
    });

    this.page.goto(url);
  }
}

new Klook();
