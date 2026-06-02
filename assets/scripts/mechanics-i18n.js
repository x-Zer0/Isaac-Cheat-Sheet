(function () {
  var payload = window.__ITEM_I18N__;
  if (!payload || !Array.isArray(payload.entries)) {
    return;
  }

  var localizedByFamily = {
    collectible: Object.create(null),
    trinket: Object.create(null)
  };
  var titleMatchers = [
    {
      family: "collectible",
      pattern: /^(?:r-itm|a-itm|ap-itm|re-itm|abn-itm|apn-itm|bpn-itm|rep)(\d+)$/
    },
    {
      family: "trinket",
      pattern: /^rep-junxx(\d+)$/
    }
  ];

  payload.entries.forEach(function (entry) {
    if (!entry || !entry.family || !entry.sid || !entry.title) {
      return;
    }

    if (entry.family === "collectible" || entry.family === "trinket") {
      if (!localizedByFamily[entry.family][entry.sid]) {
        localizedByFamily[entry.family][entry.sid] = entry.title;
      }
    }
  });

  function resolveLocalizedTitle(className) {
    var classes = className.split(/\s+/);
    for (var i = 0; i < classes.length; i += 1) {
      var token = classes[i];
      for (var j = 0; j < titleMatchers.length; j += 1) {
        var matcher = titleMatchers[j];
        var match = token.match(matcher.pattern);
        if (match) {
          return localizedByFamily[matcher.family][match[1]] || "";
        }
      }
    }

    return "";
  }

  var hoverItems = document.querySelectorAll(".hovertip");
  hoverItems.forEach(function (item) {
    var label = item.querySelector("span");
    if (!label) {
      return;
    }

    var localizedTitle = resolveLocalizedTitle(item.className || "");
    if (localizedTitle) {
      label.textContent = localizedTitle;
    }
  });
})();
