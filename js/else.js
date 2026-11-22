/* ==========================================================================
   else — website script
   - Data layer (sample data now, backend later)
   - Rotating greeting
   - Brands strip
   - Fixed header
   - Notifications from else next to the phone
   - "Ask else" bar
   - Shop: Picked for you (locked) + Just in
   - Ask else showcase conversation
   - Community posts
   - Item page
   - "Get the app" popup
   ========================================================================== */

(function () {
  "use strict";

  // ------------------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------------------

  var CONFIG = {
    // Set this once the app is live on the App Store, e.g.
    // "https://apps.apple.com/app/else/id0000000000".
    // While it is null, the popup says "Coming soon" instead of showing
    // the QR code and the App Store button.
    appStoreUrl: null,

    // Where people without an invitation go (the waitlist form lives on elsecompany.com).
    waitlistUrl: "https://elsecompany.com/",

    // Base URL of the public backend API, chosen by where the site is open:
    // - on this Mac (http://localhost:8000): the backend running on the Mac
    // - on the private preview (preview.elsecompany.com): the same address, which passes /public/** to the backend
    // - anywhere else: the backend on AWS
    apiBaseUrl: (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "http://localhost:8080"
      : location.hostname === "preview.elsecompany.com"
        ? location.origin
        : "https://api-test.elsecompany.com",

    // Which data already comes from the backend. The rest still uses the sample
    // data in js/data.js. We add each one here as its endpoint is ready.
    liveData: ["brands", "items", "posts", "greetings", "askElseShowcase"],

    // Anonymous statistics (admin > Web stats). false turns them off.
    // Off on the private preview, so the team's own visits do not count.
    statistics: location.hostname !== "preview.elsecompany.com",

    // How often the greeting changes, in milliseconds
    greetingInterval: 8000,

    // How often the "Ask else" example in the hero changes, in milliseconds
    askHintInterval: 4000
  };

  // ------------------------------------------------------------------------
  // Data layer
  // Every getter returns a Promise, so switching from sample data to the
  // backend only changes this block.
  // ------------------------------------------------------------------------

  var Data = {
    get: function (path, sampleKey) {
      var sample = (window.ELSE_SAMPLE_DATA || {})[sampleKey];
      var isLive = CONFIG.apiBaseUrl && CONFIG.liveData.indexOf(sampleKey) !== -1;
      if (!isLive) {
        return Promise.resolve(sample || []);
      }
      return fetch(CONFIG.apiBaseUrl + path, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Request failed: " + path + " (" + response.status + ")");
          }
          return response.json();
        })
        .catch(function (error) {
          // The page never looks empty: if the backend does not answer, show the sample data
          console.warn("else: using sample data for " + sampleKey + ".", error);
          return sample || [];
        });
    },

    getBrands: function () {
      return Data.get("/public/brands", "brands");
    },

    getItems: function () {
      return Data.get("/public/items", "items");
    },

    getItem: function (id) {
      // Pieces from the sample data (e.g. in sample Community posts) keep using it
      var isSample = id.indexOf("sample-") === 0;
      if (!isSample && CONFIG.liveData.indexOf("items") !== -1) {
        return fetch(CONFIG.apiBaseUrl + "/public/items/" + encodeURIComponent(id), { headers: { Accept: "application/json" } })
          .then(function (response) {
            if (response.status === 404) {
              return null;
            }
            if (!response.ok) {
              throw new Error("Request failed: item " + id + " (" + response.status + ")");
            }
            return response.json();
          });
      }
      var items = (window.ELSE_SAMPLE_DATA && window.ELSE_SAMPLE_DATA.items) || [];
      var found = items.filter(function (item) { return item.id === id; })[0];
      return Promise.resolve(found || null);
    },

    getPosts: function () {
      return Data.get("/public/posts", "posts");
    },

    getGreetings: function () {
      return Data.get("/public/greetings", "greetings");
    },

    getAskElseShowcase: function () {
      // Until the team writes one in admin > Website, keep the example in js/data.js
      return Data.get("/public/ask-else-showcase", "askElseShowcase").then(function (showcase) {
        var hasMessages = showcase && showcase.messages && showcase.messages.length;
        return hasMessages ? showcase : (window.ELSE_SAMPLE_DATA || {}).askElseShowcase;
      });
    }
  };

  // ------------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  function formatPrice(amount, currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
    } catch (error) {
      return "$" + Number(amount).toFixed(2);
    }
  }

  // "11h", "2d", "3w"... like the app
  function timeAgo(isoDate) {
    var seconds = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 3600) {
      return Math.max(1, Math.floor(seconds / 60)) + "m";
    }
    if (seconds < 86400) {
      return Math.floor(seconds / 3600) + "h";
    }
    if (seconds < 604800) {
      return Math.floor(seconds / 86400) + "d";
    }
    return Math.floor(seconds / 604800) + "w";
  }

  function svg(markup) {
    var wrapper = document.createElement("span");
    wrapper.innerHTML = markup; // static, trusted markup only (icons)
    return wrapper.firstChild;
  }

  // Photos from the backend come as "/public/photos/..." (stable addresses of light copies):
  // they live on the backend's server. Sample photos ("img/...") stay as they are.
  function photoSrc(url) {
    return url && url.charAt(0) === "/" ? CONFIG.apiBaseUrl + url : url;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------------------
  // Anonymous statistics (admin > Web stats)
  // No cookies, nothing stored in the browser, no names: a visit is this page load,
  // with a random id that disappears when the page closes. Browsers that ask not to
  // be tracked (Global Privacy Control or Do Not Track) send nothing.
  // ------------------------------------------------------------------------

  var Track = (function () {
    var optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
    var enabled = CONFIG.statistics && CONFIG.apiBaseUrl && !optedOut;
    var visit = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    var page = document.querySelector("[data-product]") ? "item" : "home";
    var queue = [];
    var context = (function () {
      var params = new URLSearchParams(window.location.search);
      var width = window.innerWidth || 0;
      var referrer = "";
      try {
        var host = document.referrer ? new URL(document.referrer).hostname : "";
        referrer = host && host !== window.location.hostname ? host.replace(/^www\./, "") : "";
      } catch (e) {
        referrer = "";
      }
      return {
        r: referrer,
        us: params.get("utm_source") || "",
        um: params.get("utm_medium") || "",
        uc: params.get("utm_campaign") || "",
        dv: width < 720 ? "mobile" : (width < 1100 ? "tablet" : "desktop"),
        w: String(Math.round(width / 100) * 100),
        l: (navigator.language || "").slice(0, 12),
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || "").slice(0, 40)
      };
    })();

    function send(useBeacon) {
      if (!enabled || !queue.length) {
        return;
      }
      var body = JSON.stringify(queue.splice(0, 30));
      var url = CONFIG.apiBaseUrl + "/public/events";
      // Plain text: the browser sends it without asking the server first, even when the page closes
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      } else {
        fetch(url, { method: "POST", body: body, headers: { "Content-Type": "text/plain" }, keepalive: true })
          .catch(function () {});
      }
    }

    function event(name, detail) {
      if (!enabled) {
        return;
      }
      var e = { v: visit, n: name, p: page, d: detail == null ? "" : String(detail) };
      // The context only travels with the page view, to keep the other events small
      if (name === "page_view") {
        Object.keys(context).forEach(function (k) { e[k] = context[k]; });
      }
      queue.push(e);
      if (queue.length >= 10) {
        send(false);
      }
    }

    if (enabled) {
      setInterval(function () { send(false); }, 5000);
      // When the page is hidden or closed: send what is left, and how long it was open
      var start = Date.now();
      var timeSent = false;
      function leaving() {
        if (!timeSent) {
          timeSent = true;
          event("time_on_page", Math.round((Date.now() - start) / 1000));
        }
        send(true);
      }
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          leaving();
        }
      });
      window.addEventListener("pagehide", leaving);
    }

    return { event: event, page: page };
  })();

  function initStatistics() {
    var itemId = new URLSearchParams(window.location.search).get("id");
    Track.event("page_view", Track.page === "item" ? itemId : "");
    if (Track.page === "item" && itemId) {
      Track.event("item_view", itemId);
    }

    // Sections that came into view (once each)
    if ("IntersectionObserver" in window) {
      var seen = {};
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var name = entry.target.getAttribute("data-track-section");
          if (entry.isIntersecting && !seen[name]) {
            seen[name] = true;
            Track.event("section_view", name);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      document.querySelectorAll("[data-track-section]").forEach(function (section) {
        observer.observe(section);
      });
    }

    // How far down the page: 25, 50, 75 and 100 %
    var marks = [25, 50, 75, 100];
    var reached = {};
    function onScroll() {
      var height = document.documentElement.scrollHeight - window.innerHeight;
      var percent = height > 0 ? (window.scrollY / height) * 100 : 100;
      marks.forEach(function (mark) {
        if (percent >= mark - 2 && !reached[mark]) {
          reached[mark] = true;
          Track.event("scroll_depth", mark);
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    // Clicks worth knowing about
    document.addEventListener("click", function (event) {
      var target = event.target.closest("a, button");
      if (!target) {
        return;
      }
      if (target.hasAttribute("data-get-app")) {
        Track.event("get_app", target.getAttribute("data-get-app") || "general");
      } else if (target.hasAttribute("data-waitlist-link")) {
        Track.event("waitlist_click");
      } else if (target.hasAttribute("data-app-store-link")) {
        Track.event("app_store_click");
      } else if (target.hasAttribute("data-scroll-cue")) {
        Track.event("scroll_cue");
      } else if (target.closest(".nav__links") || target.classList.contains("nav__logo")) {
        Track.event("nav_click", (target.textContent || "logo").trim().slice(0, 40) || "logo");
      } else if (target.classList.contains("item__link") || target.classList.contains("post__item")) {
        var href = target.getAttribute("href") || "";
        var id = href.split("id=")[1] || "";
        var where = target.closest(".community") ? "community" : (target.closest(".product__more") ? "more" : "just in");
        Track.event("item_click", decodeURIComponent(id) + " · " + where);
      } else if (target.hasAttribute("data-share")) {
        Track.event("share", navigator.share ? "share sheet" : "copy link");
      }
    }, true);
  }

  // ------------------------------------------------------------------------
  // Fixed header: light over the sky photo, frosted once past it
  // ------------------------------------------------------------------------

  function initHeader() {
    var header = document.querySelector("[data-site-header]");
    var hero = document.querySelector("[data-hero]");
    if (!header) {
      return;
    }
    // Pages without the sky photo (item.html) keep the header frosted
    if (!hero) {
      header.classList.add("is-solid");
      return;
    }
    // Home: the menu sits at the top of the sky photo and scrolls away with it.
    // Once you scroll past the photo, the frosted bar slides in and stays.
    header.classList.add("is-home");
    function update() {
      var limit = hero.offsetHeight - header.offsetHeight;
      header.classList.toggle("is-solid", window.scrollY > limit);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  // ------------------------------------------------------------------------
  // "Discover" cue: hidden as soon as the visitor scrolls
  // ------------------------------------------------------------------------

  function initScrollCue() {
    var cue = document.querySelector("[data-scroll-cue]");
    if (!cue) {
      return;
    }
    // On phones, the "Get it" bar waits until the sky photo (with its own buttons) is gone,
    // so it does not cover what peeks out below it
    var bar = document.querySelector(".app-bar");
    var hero = document.querySelector("[data-hero]");
    function update() {
      cue.classList.toggle("is-hidden", window.scrollY > 40);
      if (bar && hero) {
        bar.classList.toggle("is-waiting", window.scrollY < hero.offsetHeight * 0.6);
      }
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  // ------------------------------------------------------------------------
  // Rotating greeting (same spirit as the app's Home greeting)
  // ------------------------------------------------------------------------

  // The greetings come from the app's own lines (admin > Weather), chosen for the weather
  // in San Francisco right now, like the app's Home. {name} is filled with a sweet word.
  var GREETING_CITY = { name: "San Francisco", latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles" };
  var GREETING_NAMES = ["gorgeous", "darling", "chic one", "you"];
  var WEATHER_WORDS = { SUN: "Sunny", CLOUDS: "Cloudy", FOG: "Foggy", RAIN: "Rainy", WIND: "Windy", COLD: "Cold", HEAT: "Hot", SNOW: "Snowy" };

  // Open-Meteo weather code + temperature + wind -> the app's weather kinds
  function weatherKind(code, temperature, wind) {
    if ([71, 73, 75, 77, 85, 86].indexOf(code) !== -1) return "SNOW";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "RAIN";
    if (code === 45 || code === 48) return "FOG";
    if (wind >= 40) return "WIND";
    if (temperature >= 30) return "HEAT";
    if (temperature <= 7) return "COLD";
    if (code <= 1) return "SUN";
    return "CLOUDS";
  }

  function currentWeather() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + GREETING_CITY.latitude +
      "&longitude=" + GREETING_CITY.longitude +
      "&current=temperature_2m,weather_code,wind_speed_10m&timezone=" + encodeURIComponent(GREETING_CITY.timeZone);
    return fetch(url)
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.current) {
          return null;
        }
        var c = data.current;
        return {
          kind: weatherKind(c.weather_code, c.temperature_2m, c.wind_speed_10m),
          temperature: Math.round(c.temperature_2m)
        };
      })
      .catch(function () { return null; });
  }

  function timeOfDay() {
    var hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: GREETING_CITY.timeZone }).format(new Date()));
    return hour < 12 ? "morning" : (hour < 18 ? "afternoon" : "evening");
  }

  function initGreeting() {
    var root = document.querySelector("[data-greeting]");
    if (!root) {
      return;
    }
    var label = root.querySelector("[data-greeting-label]");
    var title = root.querySelector("[data-greeting-title]");

    Promise.all([Data.getGreetings(), currentWeather()]).then(function (results) {
      var all = results[0] || [];
      var weather = results[1];
      var city = GREETING_CITY.name.toLowerCase();

      // Lines for today's weather (everywhere or in this city, never "first of the season" ones)
      var lines = all.filter(function (g) {
        return weather && g.weather === weather.kind && !g.firstOnly && (!g.city || g.city.toLowerCase() === city);
      });
      if (!lines.length) {
        lines = all.filter(function (g) { return !g.firstOnly && !g.city; });
      }
      if (!lines.length) {
        return;
      }

      if (weather) {
        label.textContent = GREETING_CITY.name + " · " + weather.temperature + "°C " + WEATHER_WORDS[weather.kind];
      }

      var index = Math.floor(Math.random() * lines.length);
      var nameIndex = 0;

      function show() {
        var name = GREETING_NAMES[nameIndex % GREETING_NAMES.length];
        var text = lines[index].text
          .replace(/\{city\}/g, GREETING_CITY.name)
          .replace(/\{temp\}/g, weather ? weather.temperature + "°" : "")
          .replace(/\{timeOfDay\}/g, timeOfDay());
        // {name} goes in italics, like in the app
        var parts = text.split("{name}");
        title.textContent = "";
        parts.forEach(function (part, i) {
          title.appendChild(document.createTextNode(part));
          if (i < parts.length - 1) {
            title.appendChild(el("em", null, name));
          }
        });
      }

      show();
      if (reduceMotion || lines.length < 2) {
        return;
      }
      setInterval(function () {
        var next = Math.floor(Math.random() * lines.length);
        index = next === index ? (next + 1) % lines.length : next;
        nameIndex += 1;
        root.classList.add("is-changing");
        setTimeout(function () {
          show();
          root.classList.remove("is-changing");
        }, 300);
      }, CONFIG.greetingInterval);
    });
  }

  // ------------------------------------------------------------------------
  // "Ask else" bar: rotating example requests
  // ------------------------------------------------------------------------

  var ASK_HINTS = [
    "a summer dress in my size",
    "something for a wedding in Napa",
    "a bag that goes with everything",
    "a cozy knit under $150",
    "what to wear on a first date"
  ];

  function initAskHint() {
    var hint = document.querySelector("[data-ask-hint]");
    if (!hint || reduceMotion) {
      return;
    }
    var index = 0;
    setInterval(function () {
      index = (index + 1) % ASK_HINTS.length;
      hint.classList.add("is-changing");
      setTimeout(function () {
        hint.textContent = ASK_HINTS[index];
        hint.classList.remove("is-changing");
      }, 250);
    }, CONFIG.askHintInterval);
  }

  // ------------------------------------------------------------------------
  // Notifications from else next to the phone (like the app's chat messages)
  // ------------------------------------------------------------------------

  var NOTIFICATIONS = [
    "I found a Sandro suede bucket bag in like-new condition. Want it in your cart?",
    "A Staud satin slip in your size just landed. It’s very you.",
    "It’s 10°C and sunny in SF. Want a few layering ideas?",
    "Good news: your offer on the Ganni tiger hoodie was accepted.",
    "Your style DNA got sharper: Playful Mix, with a touch of Parisian Polish.",
    "Someone replied to your post in Community.",
    "That Veronica Beard cardigan you loved is still here. Shall I hold your spot?",
    "Your Staud dress sold! Want me to tell you where to drop it off?"
  ];

  var NOTIF_INTERVAL = 4500;
  var NOTIF_VISIBLE = 3;

  function notifCard(text) {
    var card = el("div", "notif");
    var icon = el("span", "notif__icon");
    var img = el("img");
    img.src = "img/mark.png";
    img.alt = "";
    icon.appendChild(img);
    var body = el("div", "notif__body");
    var head = el("div", "notif__head");
    head.appendChild(el("span", null, "Ask else"));
    head.appendChild(el("span", "notif__time", "now"));
    body.appendChild(head);
    body.appendChild(el("span", "notif__text", text));
    card.appendChild(icon);
    card.appendChild(body);
    return card;
  }

  function initNotifications() {
    var stack = document.querySelector("[data-notifs]");
    if (!stack) {
      return;
    }
    var next = 0;
    var cards = [];

    function push() {
      var card = notifCard(NOTIFICATIONS[next]);
      next = (next + 1) % NOTIFICATIONS.length;
      card.setAttribute("data-pos", "enter");
      stack.appendChild(card);
      cards.unshift(card);

      // Older ones: change "now" to minutes ago and move down the stack
      cards.forEach(function (c, i) {
        var time = c.querySelector(".notif__time");
        if (i > 0 && time) {
          time.textContent = i + "m ago";
        }
      });
      // Next frame: slide everything into place
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cards.forEach(function (c, i) {
            c.setAttribute("data-pos", i < NOTIF_VISIBLE ? String(i) : "leave");
          });
        });
      });
      // Remove the ones that left
      if (cards.length > NOTIF_VISIBLE) {
        var gone = cards.splice(NOTIF_VISIBLE);
        setTimeout(function () {
          gone.forEach(function (c) { c.remove(); });
        }, 700);
      }
    }

    if (reduceMotion) {
      // Static: show the first three, no movement
      for (var i = 0; i < NOTIF_VISIBLE; i++) {
        var card = notifCard(NOTIFICATIONS[i]);
        card.setAttribute("data-pos", String(i));
        stack.appendChild(card);
      }
      return;
    }

    // Start when the phone comes into view, then keep going
    var started = false;
    function start() {
      if (started) {
        return;
      }
      started = true;
      push();
      setInterval(function () {
        if (!document.hidden) {
          push();
        }
      }, NOTIF_INTERVAL);
    }
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          observer.disconnect();
          setTimeout(start, 600);
        }
      }, { threshold: 0.3 });
      observer.observe(stack.parentNode);
    } else {
      start();
    }
  }

  // ------------------------------------------------------------------------
  // Brands strip
  // ------------------------------------------------------------------------

  function initBrands() {
    var list = document.querySelector("[data-brands]");
    if (!list) {
      return;
    }
    Data.getBrands()
      .then(function (brands) {
        list.textContent = "";
        brands.forEach(function (brand) {
          list.appendChild(el("li", "brands__item", brand.name));
        });
      })
      .catch(function (error) {
        console.error(error);
        list.closest(".brands").hidden = true;
      });
  }

  // ------------------------------------------------------------------------
  // Ask else: plays the showcase conversation like a real chat,
  // once, when the section scrolls into view
  // ------------------------------------------------------------------------

  function renderItems(items) {
    var grid = el("div", "chat__items");
    items.forEach(function (item) {
      var card = el("div", "chat__item" + (item.sold ? " chat__item--sold" : ""));
      var photo = el("div", "chat__item-photo");
      var img = el("img");
      img.src = photoSrc(item.photoUrl);
      img.alt = item.brand + " " + item.title + (item.sold ? ", sold" : "");
      img.loading = "lazy";
      photo.appendChild(img);
      if (item.sold) {
        photo.appendChild(el("span", "chat__sold", "SOLD"));
      }
      card.appendChild(photo);
      card.appendChild(el("span", "chat__item-brand", item.brand));
      card.appendChild(el("span", "chat__item-title", item.title));
      card.appendChild(el("span", "chat__item-price", formatPrice(item.price, item.currency)));
      grid.appendChild(card);
    });
    return grid;
  }

  function bubble(message) {
    var className = "chat__bubble chat__bubble--" + (message.from === "member" ? "member" : "else");
    return el("div", className, message.text);
  }

  function typingIndicator() {
    var node = el("div", "chat__typing");
    node.setAttribute("aria-hidden", "true");
    node.appendChild(el("span"));
    node.appendChild(el("span"));
    node.appendChild(el("span"));
    return node;
  }

  function playConversation(container, messages) {
    // Without animation: show everything at once
    if (reduceMotion) {
      messages.forEach(function (message) {
        container.appendChild(bubble(message));
        if (message.items && message.items.length) {
          container.appendChild(renderItems(message.items));
        }
      });
      return Promise.resolve();
    }

    return messages.reduce(function (chain, message) {
      return chain.then(function () {
        if (message.from === "member") {
          return wait(700).then(function () {
            container.appendChild(bubble(message));
          });
        }
        var typing = typingIndicator();
        return wait(500)
          .then(function () {
            container.appendChild(typing);
            return wait(1300);
          })
          .then(function () {
            typing.remove();
            container.appendChild(bubble(message));
            if (message.items && message.items.length) {
              return wait(400).then(function () {
                container.appendChild(renderItems(message.items));
              });
            }
          });
      });
    }, Promise.resolve());
  }

  function initAskElse() {
    var container = document.querySelector("[data-ask-else]");
    if (!container) {
      return;
    }

    Data.getAskElseShowcase()
      .then(function (showcase) {
        var messages = (showcase && showcase.messages) || [];
        if (!messages.length) {
          return;
        }
        var start = function () {
          playConversation(container, messages);
        };
        if (!("IntersectionObserver" in window)) {
          start();
          return;
        }
        var observer = new IntersectionObserver(function (entries) {
          if (entries.some(function (entry) { return entry.isIntersecting; })) {
            observer.disconnect();
            start();
          }
        }, { threshold: 0.35 });
        observer.observe(container);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  // ------------------------------------------------------------------------
  // Shop: locked "Picked for you" + "Just in"
  // ------------------------------------------------------------------------

  var JUST_LISTED_HOURS = 48;

  var HEART_OUTLINE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

  function itemUrl(id) {
    return "item.html?id=" + encodeURIComponent(id);
  }

  function isJustListed(item) {
    return !item.sold && item.listedAt && (Date.now() - new Date(item.listedAt).getTime()) < JUST_LISTED_HOURS * 3600 * 1000;
  }

  function renderItem(item) {
    var card = el("div", "item" + (item.sold ? " item--sold" : ""));

    var link = el("a", "item__link");
    link.href = itemUrl(item.id);
    link.setAttribute("aria-label", item.brand + " " + item.title + ", " + (item.sold ? "sold" : formatPrice(item.price, item.currency)));

    var photo = el("div", "item__photo");
    var img = el("img");
    img.src = photoSrc(item.photoUrl);
    img.alt = "";
    img.loading = "lazy";
    photo.appendChild(img);
    if (item.sold) {
      photo.appendChild(el("span", "item__badge", "Sold"));
    } else if (isJustListed(item)) {
      photo.appendChild(el("span", "item__badge", "Just listed"));
    }
    link.appendChild(photo);

    var info = el("div", "item__info");
    info.appendChild(el("span", "item__brand", item.brand));
    info.appendChild(el("span", "item__title", item.title));
    var price = el("span", "item__price", formatPrice(item.price, item.currency));
    if (item.retailPrice) {
      price.appendChild(el("span", "item__retail", formatPrice(item.retailPrice, item.currency)));
    }
    if (item.size && item.size !== "One size") {
      price.appendChild(el("span", "item__size", "Size " + item.size));
    }
    info.appendChild(price);
    link.appendChild(info);
    card.appendChild(link);

    if (!item.sold) {
      var love = el("button", "item__love");
      love.type = "button";
      love.setAttribute("data-get-app", "love");
      love.setAttribute("aria-label", "Add to What I love, in the app");
      love.appendChild(svg(HEART_OUTLINE));
      card.appendChild(love);
    }
    return card;
  }

  function initShop() {
    var grid = document.querySelector("[data-items]");
    var locked = document.querySelector("[data-locked-items]");
    if (!grid && !locked) {
      return;
    }
    Data.getItems()
      .then(function (items) {
        if (locked) {
          // The locked "Picked for you" always uses the sample photos from js/data.js,
          // so it never repeats the real pieces shown in "Just in" right below
          var samplePicks = ((window.ELSE_SAMPLE_DATA && window.ELSE_SAMPLE_DATA.items) || [])
            .filter(function (item) { return !item.sold; });
          locked.textContent = "";
          samplePicks.slice(0, 4).forEach(function (item) {
            var img = el("img");
            img.src = photoSrc(item.photoUrl);
            img.alt = "";
            img.loading = "lazy";
            locked.appendChild(img);
          });
        }
        if (grid) {
          grid.textContent = "";
          items.slice(0, 8).forEach(function (item) {
            grid.appendChild(renderItem(item));
          });
        }
      })
      .catch(function (error) {
        console.error(error);
        document.getElementById("shop").hidden = true;
      });
  }

  // ------------------------------------------------------------------------
  // Item page (item.html?id=...)
  // ------------------------------------------------------------------------

  function listedAgo(isoDate) {
    var days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
    if (days <= 0) {
      return "Listed today";
    }
    if (days === 1) {
      return "Listed yesterday";
    }
    if (days < 30) {
      return "Listed " + days + " days ago";
    }
    return "Listed " + Math.floor(days / 30) + " months ago";
  }

  function fill(root, selector, text) {
    var node = root.querySelector(selector);
    if (node) {
      node.textContent = text;
    }
    return node;
  }

  function renderProduct(root, item) {
    var main = root.querySelector("[data-product-main]");
    document.title = item.brand + " " + item.title + " — else";

    // Photos
    var photos = (item.photos && item.photos.length) ? item.photos : [item.photoUrl];
    var mainPhoto = root.querySelector("[data-product-photo]");
    var thumbs = root.querySelector("[data-product-thumbs]");
    function showPhoto(index) {
      mainPhoto.src = photoSrc(photos[index]);
      mainPhoto.alt = item.brand + " " + item.title + (photos.length > 1 ? ", photo " + (index + 1) + " of " + photos.length : "");
      thumbs.querySelectorAll("button").forEach(function (b, i) {
        b.setAttribute("aria-current", i === index ? "true" : "false");
      });
    }
    thumbs.textContent = "";
    if (photos.length > 1) {
      photos.forEach(function (url, i) {
        var b = el("button");
        b.type = "button";
        b.setAttribute("aria-label", "Photo " + (i + 1));
        var img = el("img");
        img.src = photoSrc(url);
        img.alt = "";
        b.appendChild(img);
        b.addEventListener("click", function () { showPhoto(i); });
        thumbs.appendChild(b);
      });
    }
    showPhoto(0);

    // Text
    fill(root, "[data-product-brand]", item.brand);
    fill(root, "[data-product-title]", item.title);
    fill(root, "[data-product-price]", formatPrice(item.price, item.currency));

    var retail = root.querySelector("[data-product-retail]");
    if (item.retailPrice && item.retailPrice > item.price) {
      fill(root, "[data-product-retail-price]", formatPrice(item.retailPrice, item.currency));
      fill(root, "[data-product-discount]", Math.round((1 - item.price / item.retailPrice) * 100) + "% less");
      retail.hidden = false;
    }

    var meta = [item.size, item.condition, item.category, item.color].filter(Boolean);
    if (item.listedAt) {
      meta.push(listedAgo(item.listedAt));
    }
    fill(root, "[data-product-meta]", meta.join(" · "));

    if (item.stylingNote) {
      fill(root, "[data-product-styling-text]", item.stylingNote);
      root.querySelector("[data-product-styling]").hidden = false;
    }
    fill(root, "[data-product-description]", item.description || "");

    // Sold state
    if (item.sold) {
      root.querySelector("[data-product-actions]").hidden = true;
      root.querySelector("[data-product-sold-note]").hidden = false;
      root.querySelector("[data-product-sold]").hidden = false;
      mainPhoto.style.opacity = "0.55";
    }

    // Seller
    var seller = item.seller;
    var sellerRow = root.querySelector("[data-product-seller]");
    if (seller) {
      var avatarSlot = root.querySelector("[data-seller-avatar]");
      avatarSlot.replaceWith(avatar(seller, false));
      var name = root.querySelector("[data-seller-name]");
      name.textContent = seller.displayName;
      if (seller.verified) {
        name.appendChild(svg(ICONS.verified));
      }
      var stats = [];
      if (typeof seller.pieceCount === "number") {
        stats.push(seller.pieceCount + (seller.pieceCount === 1 ? " piece" : " pieces"));
      }
      if (typeof seller.followerCount === "number") {
        stats.push(seller.followerCount + (seller.followerCount === 1 ? " follower" : " followers"));
      }
      fill(root, "[data-seller-stats]", stats.join(" · "));
      var first = seller.displayName.split(" ")[0].replace("@", "");
      fill(root, "[data-product-more-title]", "More from " + (seller.official ? "else" : first));
    } else {
      sellerRow.hidden = true;
    }

    main.hidden = false;
  }

  function initProduct() {
    var root = document.querySelector("[data-product]");
    if (!root) {
      return;
    }
    var id = new URLSearchParams(window.location.search).get("id");
    var missing = root.querySelector("[data-product-missing]");

    // Share: native share sheet on phones, copy the link elsewhere
    root.addEventListener("click", function (event) {
      var share = event.target.closest("[data-share]");
      if (!share) {
        return;
      }
      // Real pieces share the backend's preview page, so WhatsApp, iMessage... show the photo,
      // the name and the price. It sends people straight to this page.
      var id = new URLSearchParams(window.location.search).get("id") || "";
      var isLive = id && id.indexOf("sample-") !== 0 && CONFIG.liveData.indexOf("items") !== -1;
      var url = isLive ? CONFIG.apiBaseUrl + "/share/items/" + encodeURIComponent(id) : window.location.href;
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          share.setAttribute("aria-label", "Link copied");
        });
      }
    });

    if (!id) {
      missing.hidden = false;
      return;
    }

    Promise.all([Data.getItem(id), Data.getItems()])
      .then(function (results) {
        var item = results[0];
        if (!item) {
          missing.hidden = false;
          return;
        }
        renderProduct(root, item);

        // "More from ...": other available pieces
        var others = (results[1] || []).filter(function (other) {
          return other.id !== item.id && !other.sold;
        }).slice(0, 4);
        if (others.length) {
          var grid = root.querySelector("[data-product-more-items]");
          others.forEach(function (other) {
            grid.appendChild(renderItem(other));
          });
          root.querySelector("[data-product-more]").hidden = false;
        }
      })
      .catch(function (error) {
        console.error(error);
        missing.hidden = false;
      });
  }

  // ------------------------------------------------------------------------
  // Community: posts marked "Show on web"
  // ------------------------------------------------------------------------

  var AVATAR_TINTS = ["#dce4fa", "#f1e3da", "#e2ecdf", "#ece0ee", "#f6efdc"];

  var ICONS = {
    verified: '<svg class="verified" width="18" height="18" viewBox="0 0 24 24" role="img" aria-label="Verified"><path fill="#8fa8ec" d="M12 1.8l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 20.4l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/><path d="M8 12l3 3 5-6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    reply: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>'
  };

  function tintFor(name) {
    var sum = 0;
    for (var i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return AVATAR_TINTS[sum % AVATAR_TINTS.length];
  }

  function avatar(author, small) {
    var node = el("span", "avatar" + (small ? " avatar--small" : ""));
    node.setAttribute("aria-hidden", "true");
    if (author.official) {
      var img = el("img");
      img.src = "img/mark.png";
      img.alt = "";
      node.appendChild(img);
      return node;
    }
    node.style.background = tintFor(author.displayName);
    node.textContent = author.displayName.replace("@", "").charAt(0).toUpperCase();
    return node;
  }

  function authorName(author, className) {
    var node = el("span", className, author.displayName);
    if (author.verified) {
      node.appendChild(svg(ICONS.verified));
    }
    return node;
  }

  function renderPost(post) {
    var article = el("article", "post");

    var head = el("div", "post__head");
    head.appendChild(avatar(post.author, false));
    var meta = el("div", "post__meta");
    meta.appendChild(authorName(post.author, "post__author"));
    meta.appendChild(el("span", "post__time", timeAgo(post.createdAt)));
    head.appendChild(meta);
    article.appendChild(head);

    if (post.text) {
      article.appendChild(el("p", "post__text", post.text));
    }

    // Photos of the post (the team can add up to 4 in the app)
    if (post.photos && post.photos.length) {
      var gallery = el("div", "post__photos");
      post.photos.slice(0, 4).forEach(function (url) {
        var photo = el("img");
        photo.src = photoSrc(url);
        photo.alt = "";
        photo.loading = "lazy";
        gallery.appendChild(photo);
      });
      article.appendChild(gallery);
    }

    if (post.item) {
      var item = el("a", "post__item");
      item.href = itemUrl(post.item.id);
      var photo = el("img");
      photo.src = photoSrc(post.item.photoUrl);
      photo.alt = post.item.brand + " " + post.item.title;
      photo.loading = "lazy";
      item.appendChild(photo);
      item.appendChild(el("span", "post__item-brand", post.item.brand));
      item.appendChild(el("span", "post__item-price", post.item.sold ? "Sold" : formatPrice(post.item.price, post.item.currency)));
      article.appendChild(item);
    }

    var actions = el("div", "post__actions");
    var like = el("button", "post__action");
    like.type = "button";
    like.setAttribute("data-get-app", "community");
    like.setAttribute("aria-label", post.likeCount + " likes. Like in the app");
    like.appendChild(svg(ICONS.heart));
    like.appendChild(document.createTextNode(String(post.likeCount)));
    var reply = el("button", "post__action");
    reply.type = "button";
    reply.setAttribute("data-get-app", "community");
    reply.setAttribute("aria-label", post.replyCount + " replies. Reply in the app");
    reply.appendChild(svg(ICONS.reply));
    reply.appendChild(document.createTextNode(String(post.replyCount)));
    actions.appendChild(like);
    actions.appendChild(reply);
    article.appendChild(actions);

    var replies = post.replies || [];
    if (replies.length) {
      var list = el("div", "post__replies");
      replies.slice(0, 3).forEach(function (r) {
        var row = el("div", "reply");
        row.appendChild(avatar(r.author, true));
        var body = el("div", "reply__body");
        var name = authorName(r.author, "reply__author");
        name.appendChild(el("span", "reply__time", timeAgo(r.createdAt)));
        body.appendChild(name);
        body.appendChild(el("span", "reply__text", r.text));
        row.appendChild(body);
        list.appendChild(row);
      });
      if (post.replyCount > replies.length) {
        var more = el("button", "post__more", "See all " + post.replyCount + " replies in the app");
        more.type = "button";
        more.setAttribute("data-get-app", "community");
        list.appendChild(more);
      }
      article.appendChild(list);
    }

    return article;
  }

  function initCommunity() {
    var container = document.querySelector("[data-posts]");
    if (!container) {
      return;
    }
    Data.getPosts()
      .then(function (posts) {
        container.textContent = "";
        if (!posts.length) {
          container.closest(".community").hidden = true;
          return;
        }
        posts.forEach(function (post) {
          container.appendChild(renderPost(post));
        });
      })
      .catch(function (error) {
        console.error(error);
        container.closest(".community").hidden = true;
      });
  }

  // ------------------------------------------------------------------------
  // "Get the app" popup
  // ------------------------------------------------------------------------

  // Many different messages, so the popup feels alive like the app's AI.
  // Each trigger says what the visitor was trying to do with
  // data-get-app="love|cart|offer|similar|look|follow|community|ask|dna|picks|shop".
  // The title is [plain part, italic part].
  var POPUP_MESSAGES = {
    general: [
      { title: ["Psst… this one’s better", "in the app."], text: "Save what you love, make offers, ask your stylist and get your full style DNA." },
      { title: ["Come closer. The good stuff is", "in the app."], text: "Pieces in your size, picked by AI, every single day." },
      { title: ["Your closet is", "waiting for you."], text: "else learns your style and finds the pieces you’ll actually wear." },
      { title: ["Everything’s better", "with a little else."], text: "Your stylist, your picks and the whole community, in one app." },
      { title: ["Let’s make it", "personal."], text: "The app knows your size, your style and what you’ll love next." }
    ],
    love: [
      { title: ["Love at first sight?", "Save it in the app."], text: "Keep your favorites together in What I love, in the app." },
      { title: ["Good taste.", "Keep it close."], text: "Save it in the app before someone else falls for it too." },
      { title: ["Heart it before", "someone else does."], text: "Every piece is one of a kind. Save it in the app so you don’t lose it." }
    ],
    cart: [
      { title: ["One of a kind,", "and it could be yours."], text: "Checkout happens in the app, in a couple of taps." },
      { title: ["Before it’s gone…", "grab it in the app."], text: "There’s only one. When it’s gone, it’s gone." },
      { title: ["Great choice.", "Let’s make it yours."], text: "Add it to your cart in the app and it’s on its way." }
    ],
    offer: [
      { title: ["Feeling bold?", "Make your offer."], text: "Send an offer in the app and the seller can accept it right away." },
      { title: ["Name your price", "in the app."], text: "Offers, counteroffers and a little negotiating, all in the app." }
    ],
    similar: [
      { title: ["Missed it?", "else has a few ideas."], text: "Ask else and it will find something just like it, in your size." },
      { title: ["This one’s gone,", "your next favorite isn’t."], text: "else can track down something similar for you in the app." }
    ],
    look: [
      { title: ["else already has", "a few ideas."], text: "See the full look, styled with pieces in your size, in the app." },
      { title: ["Let’s build", "the whole outfit."], text: "else pairs this piece with what’s in the closet, just for you." }
    ],
    follow: [
      { title: ["Never miss", "a new drop."], text: "Follow in the app and hear about their new pieces." },
      { title: ["Stay in", "the loop."], text: "Follow in the app and never miss what they post next." }
    ],
    community: [
      { title: ["Join the conversation", "in the app."], text: "Share your finds, your outfits and your hot takes with else members." },
      { title: ["Your hot take belongs", "in the app."], text: "Post, reply and like with the else community." },
      { title: ["The group chat is", "waiting for you."], text: "Outfit dilemmas, styling tricks and first looks, all in the app." }
    ],
    ask: [
      { title: ["else is ready", "when you are."], text: "Ask for a look, an occasion or a vibe. else knows your size and the whole closet." },
      { title: ["Your stylist is", "one tap away."], text: "Tell else what you need and it finds it for you, in the app." },
      { title: ["Ask anything.", "Really, anything."], text: "From a wedding guest look to the perfect bag, else has you covered." }
    ],
    dna: [
      { title: ["Your style DNA is ready", "to be decoded."], text: "A few swipes in the app and else gets to know your style." },
      { title: ["What’s your", "style DNA?"], text: "Find out in the app, and get pieces picked around it." }
    ],
    picks: [
      { title: ["Pieces picked", "just for you."], text: "Your daily edit, in your size and style, lives in the app." },
      { title: ["Your edit is", "ready."], text: "Unlock pieces chosen by else AI, refreshed every day." }
    ],
    shop: [
      { title: ["There’s so much", "more to see."], text: "The whole closet, with filters for your size, lives in the app." },
      { title: ["Keep scrolling", "in the app."], text: "New pieces land all the time. See them all in the app." }
    ]
  };

  var lastMessageIndex = {};

  function pickMessage(kind) {
    var list = POPUP_MESSAGES[kind] || POPUP_MESSAGES.general;
    var key = POPUP_MESSAGES[kind] ? kind : "general";
    var index = Math.floor(Math.random() * list.length);
    // Never show the same message twice in a row
    if (list.length > 1 && index === lastMessageIndex[key]) {
      index = (index + 1) % list.length;
    }
    lastMessageIndex[key] = index;
    return list[index];
  }

  function applyMessage(popup, message) {
    var title = popup.querySelector("[data-get-app-title]");
    var text = popup.querySelector("[data-get-app-text]");
    if (title) {
      title.textContent = message.title[0] + " ";
      title.appendChild(el("em", null, message.title[1]));
    }
    if (text) {
      text.textContent = message.text;
    }
  }

  function initPopup() {
    var popup = document.getElementById("get-app");
    if (!popup) {
      return;
    }

    var lastFocused = null;
    var isLive = Boolean(CONFIG.appStoreUrl);

    popup.querySelectorAll("[data-when-live]").forEach(function (node) {
      node.hidden = !isLive;
    });
    popup.querySelectorAll("[data-when-not-live]").forEach(function (node) {
      node.hidden = isLive;
    });
    document.querySelectorAll("[data-app-store-link]").forEach(function (node) {
      if (isLive) {
        node.setAttribute("href", CONFIG.appStoreUrl);
      }
    });
    document.querySelectorAll("[data-waitlist-link]").forEach(function (node) {
      node.setAttribute("href", CONFIG.waitlistUrl);
    });
    // The QR image (img/app-store-qr.svg) is only loaded once the app is live
    popup.querySelectorAll("[data-qr-src]").forEach(function (node) {
      if (isLive) {
        node.setAttribute("src", node.getAttribute("data-qr-src"));
      }
    });

    function openPopup(event, kind) {
      if (event) {
        event.preventDefault();
      }
      applyMessage(popup, pickMessage(kind));
      lastFocused = document.activeElement;
      popup.classList.add("is-open");
      popup.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      var closeButton = popup.querySelector("[data-close-app-popup]");
      if (closeButton) {
        closeButton.focus();
      }
    }

    function closePopup() {
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    // Any element with data-get-app opens the popup: "Get the app" buttons,
    // hearts, "Add to cart", "Make an offer", "Reply"...
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-get-app]");
      if (trigger) {
        openPopup(event, trigger.getAttribute("data-get-app"));
        return;
      }
      if (event.target.closest("[data-close-app-popup]")) {
        closePopup();
        return;
      }
      // A click on the dimmed background closes it too
      if (event.target === popup) {
        closePopup();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && popup.classList.contains("is-open")) {
        closePopup();
      }
    });
  }

  // ------------------------------------------------------------------------
  // Start
  // ------------------------------------------------------------------------

  initPopup();
  initStatistics();
  initHeader();
  initScrollCue();
  initGreeting();
  initAskHint();
  initNotifications();
  initBrands();
  initShop();
  initAskElse();
  initCommunity();
  initProduct();
})();
