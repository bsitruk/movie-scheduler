const puppeteer = require("puppeteer-core");
const { setTimeout } = require("node:timers/promises");

/** ** CONFIG ** */
const USERNAME = "YOUR_USERNAME";
const PASSWORD = "YOUR_PASSWORD";
/** ** .. CONFIG ** */

const WATCH_URL = "https://www.netflix.com/watch/";

let browser;
exports.run = async function ({ videoId, sessionDurationInMin }) {
  if (browser) await browser.close();
  browser = await puppeteer.launch({
    headless: false,
    channel: "chrome",
    args: [
      "--start-maximized",
      "--disable-notifications",
      "--disable-infobars",
      "--disable-session-crashed-bubble",
      "--app=https://google.com",
      // "--disable-extensions",
      "--user-data-dir=./Google/Chrome/User Data/",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  const timeout = 10000;
  page.setDefaultTimeout(timeout);
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36"
  );

  async function waitForSelectors(selectors, frame, options) {
    for (const selector of selectors) {
      try {
        return await waitForSelector(selector, frame, options);
      } catch (err) {
        console.error(err);
      }
    }
    throw new Error(
      "Could not find element for selectors: " + JSON.stringify(selectors)
    );
  }

  async function scrollIntoViewIfNeeded(element, timeout) {
    await waitForConnected(element, timeout);
    const isInViewport = await element.isIntersectingViewport({ threshold: 0 });
    if (isInViewport) {
      return;
    }
    await element.evaluate((element) => {
      element.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "auto",
      });
    });
    await waitForInViewport(element, timeout);
  }

  async function waitForConnected(element, timeout) {
    await waitForFunction(async () => {
      return await element.getProperty("isConnected");
    }, timeout);
  }

  async function waitForInViewport(element, timeout) {
    await waitForFunction(async () => {
      return await element.isIntersectingViewport({ threshold: 0 });
    }, timeout);
  }

  async function waitForSelector(selector, frame, options) {
    if (!Array.isArray(selector)) {
      selector = [selector];
    }
    if (!selector.length) {
      throw new Error("Empty selector provided to waitForSelector");
    }
    let element = null;
    for (let i = 0; i < selector.length; i++) {
      const part = selector[i];
      if (element) {
        element = await element.waitForSelector(part, options);
      } else {
        element = await frame.waitForSelector(part, options);
      }
      if (!element) {
        throw new Error("Could not find element: " + selector.join(">>"));
      }
      if (i < selector.length - 1) {
        element = (
          await element.evaluateHandle((el) =>
            el.shadowRoot ? el.shadowRoot : el
          )
        ).asElement();
      }
    }
    if (!element) {
      throw new Error("Could not find element: " + selector.join("|"));
    }
    return element;
  }

  async function waitForElement(step, frame, timeout) {
    const count = step.count || 1;
    const operator = step.operator || ">=";
    const comp = {
      "==": (a, b) => a === b,
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
    };
    const compFn = comp[operator];
    await waitForFunction(async () => {
      const elements = await querySelectorsAll(step.selectors, frame);
      return compFn(elements.length, count);
    }, timeout);
  }

  async function querySelectorsAll(selectors, frame) {
    for (const selector of selectors) {
      const result = await querySelectorAll(selector, frame);
      if (result.length) {
        return result;
      }
    }
    return [];
  }

  async function querySelectorAll(selector, frame) {
    if (!Array.isArray(selector)) {
      selector = [selector];
    }
    if (!selector.length) {
      throw new Error("Empty selector provided to querySelectorAll");
    }
    let elements = [];
    for (let i = 0; i < selector.length; i++) {
      const part = selector[i];
      if (i === 0) {
        elements = await frame.$$(part);
      } else {
        const tmpElements = elements;
        elements = [];
        for (const el of tmpElements) {
          elements.push(...(await el.$$(part)));
        }
      }
      if (elements.length === 0) {
        return [];
      }
      if (i < selector.length - 1) {
        const tmpElements = [];
        for (const el of elements) {
          const newEl = (
            await el.evaluateHandle((el) =>
              el.shadowRoot ? el.shadowRoot : el
            )
          ).asElement();
          if (newEl) {
            tmpElements.push(newEl);
          }
        }
        elements = tmpElements;
      }
    }
    return elements;
  }

  async function waitForFunction(fn, timeout) {
    let isActive = true;
    setTimeout(() => {
      isActive = false;
    }, timeout);
    while (isActive) {
      const result = await fn();
      if (result) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out");
  }

  async function login() {
    {
      const targetPage = page;
      const promises = [];
      promises.push(
        targetPage.waitForNavigation().catch((e) => console.log(e))
      );
      await targetPage.goto("https://www.netflix.com/il-en/");
      await Promise.all(promises);
    }
    {
      const targetPage = page;
      const promises = [];
      promises.push(
        targetPage.waitForNavigation().catch((e) => console.log(e))
      );
      const element = await waitForSelectors(
        [["[data-uia=header-login-link]"], ["aria/Sign In"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 34.4921875, y: 23 } });
      await Promise.all(promises);
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=login-field]"], ["aria/Email or phone number"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 192, y: 24 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=login-field]"], ["aria/Email or phone number"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      const type = await element.evaluate((el) => el.type);
      if (
        [
          "textarea",
          "select-one",
          "text",
          "url",
          "tel",
          "search",
          "password",
          "number",
          "email",
        ].includes(type)
      ) {
        await element.type(USERNAME);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, USERNAME);
      }
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=login-page-title]"], ['aria/Sign In[role="heading"]']],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 219, y: 19 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=password-field]"], ["aria/Password"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 153, y: 26 } });
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=password-field]"], ["aria/Password"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      const type = await element.evaluate((el) => el.type);
      if (
        [
          "textarea",
          "select-one",
          "text",
          "url",
          "tel",
          "search",
          "password",
          "number",
          "email",
        ].includes(type)
      ) {
        await element.type(PASSWORD);
      } else {
        await element.focus();
        await element.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, PASSWORD);
      }
    }
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [["[data-uia=login-page-container]"]],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 420, y: 257 } });
    }
    {
      const targetPage = page;
      const promises = [];
      promises.push(
        targetPage.waitForNavigation().catch((e) => console.log(e))
      );
      const element = await waitForSelectors(
        [["[data-uia=login-submit-button]"], ['aria/Sign In[role="button"]']],
        targetPage,
        { timeout, visible: true }
      );
      await scrollIntoViewIfNeeded(element, timeout);
      await element.click({ offset: { x: 254, y: 31 } });
      await Promise.all(promises);
    }
  }

  {
    const targetPage = page;
    await targetPage.setViewport({ width: 0, height: 0 });
  }
  // {
  //   try {
  //     await login();
  //   } catch (e) {
  //     console.warn("no logging in", e);
  //   }
  // }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation().catch((e) => console.log(e)));
    await targetPage.goto(WATCH_URL + videoId);
    await Promise.all(promises);
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [["[data-uia=control-fullscreen-enter]"]],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({
      offset: { x: 19.15509033203125, y: 17.15509033203125 },
    });
  }

  await setTimeout(1000 * 60 * sessionDurationInMin);
  await browser.close();
};
