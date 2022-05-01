const puppeteer = require("puppeteer-core");
const { setTimeout } = require("node:timers/promises");

/** ** CONFIG ** */
const USERNAME = "YOUR_ROUTER_USERNAME";
const PASSWORD = "YOUR_ROUTER_PASSWORD";
/** ** .. CONFIG ** */

exports.reset = async function () {
  const browser = await puppeteer.launch({
    headless: false,
    channel: "chrome",
    args: [
      "--start-maximized",
      "--disable-notifications",
      "--disable-infobars",
      // "--disable-extensions",
      // "--user-data-dir=./Google/Chrome/User Data/",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  const timeout = 10000;
  page.setDefaultTimeout(timeout);

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

  {
    const targetPage = page;
    await targetPage.setViewport({ width: 0, height: 0 });
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation().catch((e) => console.log(e)));
    await targetPage.goto("http://192.168.0.1/");
    await Promise.all(promises);
  }

  {
    const targetPage = page;
    const element = await waitForSelectors(
      [["aria/Username*"], ["#loginDialogUsername"]],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({ offset: { x: 89, y: 19.296875 } });
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [["aria/Username*"], ["#loginDialogUsername"]],
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
    await targetPage.keyboard.down("Tab");
  }
  {
    const targetPage = page;
    await targetPage.keyboard.up("Tab");
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        ["aria/Password*"],
        [
          "#ngdialog1 > div.ngdialog-content > form > div.dialog_content > label:nth-child(2) > div.nwfield_content > div > input",
        ],
      ],
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
      [
        ["aria/LOGIN"],
        [
          "#ngdialog1 > div.ngdialog-content > form > div.dialog_button_panel.button_block.right > button.colored.flat.ng-binding",
        ],
      ],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({ offset: { x: 33, y: 5.703125 } });
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        [
          "#lblock > div.mmenu > div > ul:nth-child(1) > li:nth-child(12) > span",
        ],
      ],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({ offset: { x: 92, y: 35.7578125 } });
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        ["aria/Configuration"],
        [
          "#lblock > div.mmenu > div > ul:nth-child(1) > li:nth-child(12) > ul > div:nth-child(1) > li > a",
        ],
      ],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({ offset: { x: 92, y: 12.28125 } });
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        ["aria/Reboot"],
        [
          "#mblock > div.mobile_content_contener > div > ui-view > div > div.second_col > ul > li:nth-child(5) > h3",
        ],
      ],
      targetPage,
      { timeout, visible: true }
    );
    await scrollIntoViewIfNeeded(element, timeout);
    targetPage.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await element.click({
      offset: { x: 38.71002197265625, y: 13.459991455078125 },
    });
  }

  await setTimeout(5000);
  await browser.close();
};
