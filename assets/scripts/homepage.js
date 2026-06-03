function getEntryVariant($node) {
    var title = $.trim($node.find(".item-title").first().text() || "");
    if (/\(tainted\)/i.test(title)) {
        return "tainted";
    }
    return "base";
}

function getEntryFamily($node) {
    var itemIdText = $.trim($node.find(".r-itemid").first().text() || "");
    var itemIdLabel = $.trim(itemIdText.split(":")[0] || "");
    if (itemIdLabel === "TrinketID") {
        return "trinket";
    }
    if (itemIdLabel === "CardID") {
        return "card";
    }
    return "collectible";
}

function getEntryKey($node) {
    var family = getEntryFamily($node);
    var sid = String($node.data("sid") || "");
    var tid = String($node.data("tid") || "");
    var variant = getEntryVariant($node);
    return [family, sid, tid, variant].join(":");
}

var ITEM_SELECTOR = ".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item";
var META_VALUE_TRANSLATIONS = {
    "Active": "\u4e3b\u52a8\u9053\u5177",
    "Passive": "\u88ab\u52a8\u9053\u5177",
    "Passive, Tear Modifier": "\u88ab\u52a8\u9053\u5177, \u6cea\u5f39\u4fee\u6b63",
    "Varies": "\u53ef\u53d8",
    "Instant": "\u77ac\u65f6",
    "Secret Room": "\u9690\u85cf\u623f",
    "Crane Game": "\u6293\u5a03\u5a03\u673a",
    "Item Room": "\u9053\u5177\u623f",
    "Greed Mode Item Room": "\u8d2a\u5a6a\u6a21\u5f0f\u9053\u5177\u623f",
    "Devil Room": "\u6076\u9b54\u623f",
    "Angel Room": "\u5929\u4f7f\u623f",
    "Shop": "\u5546\u5e97",
    "Golden Chest": "\u91d1\u7bb1\u5b50",
    "Mom's Chest": "\u5988\u5988\u7bb1\u5b50",
    "Old Chest": "\u65e7\u7bb1\u5b50"
};
var SPECIAL_POPUP_LINKS = {
    "278": "<a id=\"DankBumLink\" href=\"dark-bum\"></a>",
    "331": "<a id=\"IlluminatiLink\" href=\"109\"></a>",
    "429": "<a id=\"ButtLink\" href=\"ultra-butt\"></a>"
};

function escapeHtml(value) {
    return $("<div>").text(value == null ? "" : String(value)).html();
}

function localizeMetaValue(value, localeCode) {
    if (localeCode !== "zh-CN") {
        return value;
    }

    if ($.isArray(value)) {
        return $.map(value, function (entry) {
            return META_VALUE_TRANSLATIONS[entry] || entry;
        });
    }

    return META_VALUE_TRANSLATIONS[value] || value;
}

function buildMetaParagraph(label, value, localeCode) {
    var normalizedValue = localizeMetaValue(value, localeCode);
    if ($.isArray(normalizedValue)) {
        normalizedValue = normalizedValue.join(", ");
    }
    return "<p>" + escapeHtml(label) + ": " + escapeHtml(normalizedValue) + "</p>";
}

function renderMetaParagraphs(meta, localeCode) {
    if (!meta) {
        return "";
    }

    var parts = [];
    var typeLabel = localeCode === "zh-CN" ? "\u7c7b\u578b" : "Type";
    var rechargeLabel = localeCode === "zh-CN" ? "\u5145\u80fd\u65f6\u95f4" : "Recharge Time";
    var poolLabel = localeCode === "zh-CN" ? "\u9053\u5177\u6c60" : "Item Pool";

    if (meta.type) {
        parts.push(buildMetaParagraph(typeLabel, meta.type, localeCode));
    }
    if (meta["recharge time"]) {
        parts.push(buildMetaParagraph(rechargeLabel, meta["recharge time"], localeCode));
    }
    if (meta.itemPools && meta.itemPools.length) {
        parts.push(buildMetaParagraph(poolLabel, meta.itemPools, localeCode));
    }

    $.each(meta, function (key, value) {
        if (key === "type" || key === "recharge time" || key === "itemPools") {
            return;
        }
        parts.push(buildMetaParagraph(key, value, localeCode));
    });

    return parts.join("");
}

function buildLocalizedSpanHtml(baseEntry, localeEntry, localeCode) {
    var bodyHtml = $.map(localeEntry.body || [], function (line) {
        return "<p>" + escapeHtml(line) + "</p>";
    }).join("");

    var unlockHtml = localeEntry.unlock ? "<p class=\"r-unlock\">" + escapeHtml(localeEntry.unlock) + "</p>" : "";
    var qualityLabel = localeCode === "zh-CN" ? "\u54c1\u8d28" : "Quality";
    var qualityHtml = baseEntry.quality ? "<p class=\"quality\">" + qualityLabel + ": " + escapeHtml(baseEntry.quality) + "</p>" : "";
    var itemIdValue = baseEntry.itemIdValue ? escapeHtml(baseEntry.itemIdValue) : escapeHtml(baseEntry.sid);
    var itemIdLabel = baseEntry.itemIdLabel ? escapeHtml(baseEntry.itemIdLabel) : "ID";
    var metaHtml = renderMetaParagraphs(localeEntry.meta || baseEntry.meta || {}, localeCode);
    var tagsHtml = "<p class=\"tags\">" + escapeHtml((baseEntry.tags || []).join(", ")) + "</p>";

    return [
        "<p class=\"item-title\">" + escapeHtml(localeEntry.title) + "</p>",
        "<p class=\"r-itemid\">" + itemIdLabel + ": " + itemIdValue + "</p>",
        "<p class=\"pickup\">" + escapeHtml(localeEntry.pickup || "") + "</p>",
        qualityHtml,
        bodyHtml,
        unlockHtml,
        "<ul>" + metaHtml + "</ul>",
        tagsHtml
    ].join("");
}

function applyLocalizedEntries(localePayload, localeCode) {
    if (!localePayload || !localePayload.entries || !localePayload.locales || !localePayload.locales[localeCode]) {
        return;
    }

    var baseMap = {};
    $.each(localePayload.entries, function (_, entry) {
        baseMap[entry.entryKey] = entry;
    });

    var localeMap = localePayload.locales[localeCode];

    $(".textbox").each(function () {
        var $node = $(this);
        var entryKey = getEntryKey($node);
        var baseEntry = baseMap[entryKey];
        var localeEntry = localeMap[entryKey];

        if (!baseEntry || !localeEntry) {
            return;
        }

        $node.attr("data-entry-key", entryKey);
        $node.find("span").first().html(buildLocalizedSpanHtml(baseEntry, localeEntry, localeCode));
    });
}

function loadAndApplyLocale(localeCode) {
    if (!$(".textbox").length) {
        return $.Deferred().resolve().promise();
    }

    if (window.__ITEM_I18N__) {
        applyLocalizedEntries(window.__ITEM_I18N__, localeCode || window.__ITEM_I18N__.defaultLocale || "zh-CN");
    }

    return $.Deferred().resolve().promise();
}

function buildPopupMarkup(markup, id) {
    return markup + (SPECIAL_POPUP_LINKS[String(id)] || "");
}

function showPopup(markup, useAnimation) {
    var node = document.getElementById("popup");
    node.innerHTML = markup;

    if (useAnimation === false) {
        node.style.display = "block";
        document.getElementById("darkback").style.display = "block";
        return;
    }

    $(".itm-popup").stop(true, true).slideDown();
    $(".overlay").stop(true, true).fadeIn();
}

function normalizeLookupValue(value) {
    return $.trim(String(value == null ? "" : value)).replace(/\s+/g, " ").toLowerCase();
}

function uniqueValues(values) {
    var seen = {};
    var result = [];

    $.each(values, function (_, value) {
        if (!value || seen[value]) {
            return;
        }
        seen[value] = true;
        result.push(value);
    });

    return result;
}

function getFamilyDisplayLabel(family, localeCode) {
    var labels = {
        collectible: localeCode === "zh-CN" ? "道具" : "Items",
        trinket: localeCode === "zh-CN" ? "饰品" : "Trinkets",
        card: localeCode === "zh-CN" ? "卡牌 / 符文" : "Cards / Runes"
    };

    return labels[family] || family;
}

function getFilterOptionDisplay(value, localeCode) {
    var localized = localizeMetaValue(value, localeCode);

    if ($.isArray(localized)) {
        return localized.join(", ");
    }

    return localized;
}

function getCanonicalMetaOptionValue(value, group) {
    var normalized = normalizeLookupValue(value);
    var aliases = {
        type: {
            "passive, tear modifier": "Passive, Tear Modifier"
        },
        pool: {
            "item room": "Item Room",
            "greed mode item room": "Greed Mode Item Room",
            "none (blood donation machine only)": "None (Blood Donation machine only)"
        }
    };

    return aliases[group] && aliases[group][normalized] ? aliases[group][normalized] : value;
}

function getSimplifiedTypeKey(value) {
    var normalized = normalizeLookupValue(value);

    if (normalized.indexOf("主动") !== -1 || normalized.indexOf("active") !== -1) {
        return "active";
    }
    if (normalized.indexOf("被动") !== -1 || normalized.indexOf("passive") !== -1) {
        return "passive";
    }

    return "";
}

function populateFilterSelect($select, defaultLabel, options) {
    $select.empty();
    $select.append($("<option>").val("").text(defaultLabel));

    $.each(options, function (_, option) {
        $select.append($("<option>").val(option.value).text(option.label));
    });
}

function buildItemFilterController(localePayload, localeCode) {
    if (!localePayload || !localePayload.entries || !localePayload.locales || !localePayload.locales[localeCode]) {
        return null;
    }

    var $panel = $(".item-filter-panel");
    if (!$panel.length) {
        return null;
    }

    var $family = $("#filter-family");
    var $type = $("#filter-type");
    var $pool = $("#filter-pool");
    var $tag = $("#filter-tag");
    var $search = $(".search-input");
    var $result = $("#item-filter-result");
    var $active = $("#item-filter-active");
    var $reset = $(".item-filter-reset");
    var baseMap = {};
    var localeMap = localePayload.locales[localeCode] || {};
    var records = [];
    var sectionRecords = $.map($(".main > div").not(".itm-popup"), function (sectionNode, index) {
        var $section = $(sectionNode);
        $section.attr("data-filter-section-index", index);
        return {
            $node: $section,
            itemCount: $section.children(".textbox").length,
            matchedCount: 0,
            isVisible: true
        };
    });
    var familyOptions = [];
    var poolOptionsByKey = {};
    var familyOrder = {
        collectible: 1,
        trinket: 2,
        card: 3
    };
    var allowedPoolLabels = {
        "商店": true,
        "天使房": true,
        "妈妈箱子": true,
        "恶魔房": true,
        "抓娃娃机": true,
        "旧箱子": true,
        "贪婪模式道具房": true,
        "道具房": true,
        "金箱子": true,
        "隐藏房": true
    };

    $.each(localePayload.entries, function (_, entry) {
        baseMap[entry.entryKey] = entry;
    });

    $(".textbox").each(function () {
        var $node = $(this);
        var entryKey = $node.attr("data-entry-key") || getEntryKey($node);
        var baseEntry = baseMap[entryKey];
        var localeEntry = localeMap[entryKey] || baseEntry;
        var meta = (localeEntry && localeEntry.meta) || (baseEntry && baseEntry.meta) || {};
        var typeRaw = meta.type || "";
        var typeCanonical = getCanonicalMetaOptionValue(typeRaw, "type");
        var typeDisplay = typeCanonical ? getFilterOptionDisplay(typeCanonical, localeCode) : "";
        var typeKey = getSimplifiedTypeKey(typeDisplay || typeCanonical || typeRaw);
        var itemPools = $.isArray(meta.itemPools) ? meta.itemPools : [];
        var poolKeys = [];
        var poolLabels = [];
        var sectionIndex = parseInt($node.parent().attr("data-filter-section-index"), 10);
        var tagValues = uniqueValues([].concat(baseEntry && baseEntry.tags || [], localeEntry && localeEntry.tags || []));
        var searchAliases = uniqueValues([].concat(baseEntry && baseEntry.searchAliases || [], localeEntry && localeEntry.searchAliases || []));

        if (!baseEntry) {
            return;
        }

        $.each(itemPools, function (_, pool) {
            var poolCanonical = getCanonicalMetaOptionValue(pool, "pool");
            var poolDisplay = getFilterOptionDisplay(poolCanonical, localeCode);
            var poolKey = normalizeLookupValue(poolDisplay || poolCanonical || pool);
            if (!poolKey) {
                return;
            }

            poolKeys.push(poolKey);
            poolLabels.push(poolDisplay || pool);
            if (allowedPoolLabels[poolDisplay] && !poolOptionsByKey[poolKey]) {
                poolOptionsByKey[poolKey] = poolDisplay || pool;
            }
        });

        if (baseEntry.family) {
            familyOptions.push(baseEntry.family);
        }

        records.push({
            $node: $node,
            family: baseEntry.family || getEntryFamily($node),
            typeKey: typeKey,
            poolKeys: uniqueValues(poolKeys),
            quality: String(baseEntry.quality || ""),
            sectionIndex: isNaN(sectionIndex) ? -1 : sectionIndex,
            isVisible: true,
            isFaded: false,
            tagsText: normalizeLookupValue(tagValues.join(" ")),
            searchText: normalizeLookupValue([
                $node.text(),
                baseEntry.title,
                localeEntry && localeEntry.title,
                baseEntry.pickup,
                localeEntry && localeEntry.pickup,
                $.isArray(baseEntry.body) ? baseEntry.body.join(" ") : "",
                $.isArray(localeEntry && localeEntry.body) ? localeEntry.body.join(" ") : "",
                baseEntry.unlock,
                localeEntry && localeEntry.unlock,
                searchAliases.join(" "),
                tagValues.join(" "),
                typeRaw,
                poolLabels.join(" "),
                baseEntry.itemIdLabel,
                baseEntry.itemIdValue
            ].join(" "))
        });
    });

    populateFilterSelect($family, "全部分类", $.map(uniqueValues(familyOptions).sort(function (left, right) {
        return (familyOrder[left] || 99) - (familyOrder[right] || 99);
    }), function (family) {
        return {
            value: family,
            label: getFamilyDisplayLabel(family, localeCode)
        };
    }));

    populateFilterSelect($type, "全部类型", [
        { value: "active", label: "主动道具" },
        { value: "passive", label: "被动道具" }
    ]);

    populateFilterSelect($pool, "全部道具池", $.map(Object.keys(poolOptionsByKey).sort(function (left, right) {
        return String(poolOptionsByKey[left]).localeCompare(String(poolOptionsByKey[right]));
    }), function (key) {
        return {
            value: key,
            label: poolOptionsByKey[key]
        };
    }));

    function buildTagKeywords(value) {
        return $.grep(normalizeLookupValue(value).split(/[\s,，]+/), function (keyword) {
            return !!keyword;
        });
    }

    function buildActiveDescriptions(state) {
        var descriptions = [];

        if (state.searchValue) {
            descriptions.push("搜索: " + state.searchValue);
        }
        if (state.familyValue) {
            descriptions.push("分类: " + $family.find("option:selected").text());
        }
        if (state.typeValue) {
            descriptions.push("类型: " + $type.find("option:selected").text());
        }
        if (state.poolValue) {
            descriptions.push("道具池: " + $pool.find("option:selected").text());
        }
        if (state.tagKeywords.length) {
            descriptions.push("标签包含: " + state.tagKeywords.join(", "));
        }

        return descriptions;
    }

    function updateSectionVisibility(hasCriteria, useFade) {
        $.each(sectionRecords, function (_, section) {
            var shouldShow = true;
            if (section.itemCount && hasCriteria && !useFade) {
                shouldShow = section.matchedCount > 0;
            }

            if (section.isVisible === shouldShow) {
                return;
            }

            section.isVisible = shouldShow;
            if (shouldShow) {
                section.$node.show();
            } else {
                section.$node.hide();
            }
        });
    }

    function readState() {
        return {
            searchValue: normalizeLookupValue($search.val()),
            familyValue: $family.val(),
            typeValue: $type.val(),
            poolValue: $pool.val(),
            tagKeywords: buildTagKeywords($tag.val())
        };
    }

    function applyFilters() {
        var state = readState();
        var useFade = $("#fade").is(":checked");
        var totalCount = records.length;
        var matchedCount = 0;
        var activeDescriptions = buildActiveDescriptions(state);
        var hasCriteria = activeDescriptions.length > 0;

        $.each(sectionRecords, function (_, section) {
            section.matchedCount = 0;
        });

        $.each(records, function (_, record) {
            var matches = true;
            var shouldShow;
            var shouldFade;

            if (state.searchValue && record.searchText.indexOf(state.searchValue) === -1) {
                matches = false;
            }
            if (matches && state.familyValue && record.family !== state.familyValue) {
                matches = false;
            }
            if (matches && state.typeValue && record.typeKey !== state.typeValue) {
                matches = false;
            }
            if (matches && state.poolValue && $.inArray(state.poolValue, record.poolKeys) === -1) {
                matches = false;
            }
            if (matches && state.tagKeywords.length) {
                $.each(state.tagKeywords, function (_, keyword) {
                    if (record.tagsText.indexOf(keyword) === -1) {
                        matches = false;
                        return false;
                    }
                });
            }

            if (matches) {
                matchedCount += 1;
                if (record.sectionIndex !== -1 && sectionRecords[record.sectionIndex]) {
                    sectionRecords[record.sectionIndex].matchedCount += 1;
                }
            }

            shouldShow = matches || useFade;
            shouldFade = !matches && useFade;

            if (record.isVisible !== shouldShow) {
                record.isVisible = shouldShow;
                record.$node.toggle(shouldShow);
            }

            if (record.isFaded !== shouldFade) {
                record.isFaded = shouldFade;
                record.$node.toggleClass("fade", shouldFade);
            }
        });

        updateSectionVisibility(hasCriteria, useFade);

        if (hasCriteria) {
            $result.text("匹配 " + matchedCount + " / " + totalCount + " 个条目");
            $active.text("当前条件: " + activeDescriptions.join(" · "));
        } else {
            $result.text("显示全部 " + totalCount + " 个条目");
            $active.text("当前未启用额外筛选条件");
        }
    }

    $reset.on("click", function () {
        $family.val("");
        $type.val("");
        $pool.val("");
        $tag.val("");
        $search.val("").removeClass("x onX");
        applyFilters();
    });

    return {
        applyFilters: applyFilters
    };
}

function findItemFromID(id) {
    var val = id.toString();
    var node = $("body").find("[data-sid='" + val + "']");
    if (node.html() === undefined) {
        return "";
    }
    return buildPopupMarkup(node.html(), val);
}

function closepp() {
    var k = document.getElementById("popup");
    document.getElementById("darkback").style.display = "none";
    k.style.display = "none";
    k.innerHTML = "";
}

function initpp() {
    closepp();

    var chk = getQueryVariable("id");
    if (chk !== false && /^\d+$/.test(chk)) {
        var markup = findItemFromID(chk);
        if (!markup) {
            return;
        }

        markup += "<a class=\"pp-close\" onclick=\"closepp()\">x</a>";
        showPopup(markup, false);
    }
}

function cCo() {
    var ta = gC("sort");
    var id = document.getElementById("itemid");
    var cl = document.getElementById("colour");
    var az = document.getElementById("alphabet");
    if (ta === "id") {
        $(".textbox").tsort({ attr: "data-sid" });
        if (az && id && cl) {
            az.checked = false;
            cl.checked = false;
            id.checked = true;
        }
    } else if (ta === "co") {
        $(".textbox").tsort({ attr: "data-cid" });
        if (az && id && cl) {
            az.checked = false;
            cl.checked = true;
            id.checked = false;
        }
    } else if (ta === "az") {
        $(".textbox").tsort({ attr: "data-tid" });
        if (az && id && cl) {
            az.checked = true;
            cl.checked = false;
            id.checked = false;
        }
    } else {
        $(".textbox").tsort({ attr: "data-sid" });
        if (az && id && cl) {
            az.checked = false;
            cl.checked = false;
            id.checked = true;
        }
    }

    var fi = gC("filter");
    var rm = document.getElementById("remove");
    var fa = document.getElementById("fade");
    if (fi === "f") {
        if (rm && fa) {
            rm.checked = false;
            fa.checked = true;
        }
    } else if (fi === "r") {
        if (rm && fa) {
            rm.checked = true;
            fa.checked = false;
        }
    } else {
        if (rm && fa) {
            rm.checked = true;
            fa.checked = false;
        }
    }

    var z = gC("size");
    var y = document.getElementById("small");
    var x = document.getElementById("medium");
    if (z === "s") {
        if (y && x) {
            $(ITEM_SELECTOR)
                .removeClass("large")
                .addClass("small");
            y.checked = true;
            x.checked = false;
        }
    } else if (y && x) {
        $(ITEM_SELECTOR)
            .removeClass("small")
            .removeClass("large");
        y.checked = false;
        x.checked = true;
    }
}

$(document).ready(function () {
    loadAndApplyLocale("zh-CN").always(function () {
        var $main = $(".main");
        var $searchInput = $(".search-input");
        var bounceRate = $(window).width() > 1000 ? 250 : 500;
        var itemFilterController = buildItemFilterController(window.__ITEM_I18N__, "zh-CN");

        initpp();
        cCo();
        $.ajaxSetup({
            cache: false
        });

        jQuery.expr[":"].Contains = function (a, i, m) {
            return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
        };

        function filterList(list) {
            var $form = $("header .container .search form");

            $form.on("submit", function (event) {
                event.preventDefault();
            });

            $searchInput.change(_.debounce(function () {
                if (itemFilterController) {
                    itemFilterController.applyFilters();
                } else {
                    var filter = $(this).val();
                    if (filter) {
                        var $matches = $(list).find("a:Contains(" + filter.trim() + ")").parent();
                        if ($("#remove").is(":checked")) {
                            $("li", list).not($matches).hide();
                        } else if ($("#fade").is(":checked")) {
                            $("li", list).not($matches).addClass("fade");
                        }
                        $matches.show();
                        $matches.removeClass("fade");
                    } else {
                        $(list).find("li").show();
                        $(list).find("li").removeClass("fade");
                    }
                }
                return false;
            }, bounceRate)).keyup(function () {
                $(this).change();
            });
        }

        filterList($main);

        function tog(v) {
            return v ? "addClass" : "removeClass";
        }

        $(document).on("keydown", function () {
            if (!$searchInput.is(":focus")) {
                $searchInput.focus();
            }
        });

        $(document).on("input", "header .container .search input[type=text]", function () {
            $(this)[tog(this.value)]("x");
        }).on("mousemove", ".x", function (e) {
            $(this)[tog(this.offsetWidth - 30 < e.clientX - this.getBoundingClientRect().left)]("onX");
        }).on("click", ".onX", function () {
            $(this).removeClass("x onX").val("");
            if (itemFilterController) {
                itemFilterController.applyFilters();
            } else {
                $(".main").find("li").fadeIn("fast");
                $(".main").find("li").removeClass("fade");
            }
        });

        $("#filter-family, #filter-type, #filter-pool").on("change", function () {
            if (itemFilterController) {
                itemFilterController.applyFilters();
            }
        });

        $("#filter-tag").on("input", _.debounce(function () {
            if (itemFilterController) {
                itemFilterController.applyFilters();
            }
        }, bounceRate));

        $(".item-filter-trigger").on("click", function () {
            $(".item-filter-popover").toggleClass("is-open");
        });

        $("input[name=size]").on("click", function () {
            if ($("#small").is(":checked")) {
                $(ITEM_SELECTOR)
                    .removeClass("large")
                    .addClass("small");
            } else if ($("#medium").is(":checked")) {
                $(ITEM_SELECTOR)
                    .removeClass("small")
                    .removeClass("large");
            }
        });

        $("input[name=sort]").on("click", function () {
            if ($("#itemid").is(":checked")) {
                $(".textbox").tsort({ attr: "data-sid" });
            } else if ($("#colour").is(":checked")) {
                $(".textbox").tsort({ attr: "data-cid" });
            } else if ($("#alphabet").is(":checked")) {
                $(".textbox").tsort({ attr: "data-tid" });
            }
        });

        $("input[name=spacing]").on("click", function () {
            if ($("#closer").is(":checked")) {
                $(ITEM_SELECTOR).addClass("closer");
            } else if ($("#spaced").is(":checked")) {
                $(ITEM_SELECTOR).removeClass("closer");
            }
        });

        $("input[name=filter]").on("click", function () {
            if (itemFilterController) {
                itemFilterController.applyFilters();
            }
        });

        $main.on("click", ".textbox", function () {
            var $entry = $(this);
            var val = $entry.data("sid");
            var markup = buildPopupMarkup($entry.children().html(), val);

            markup += "<a class=\"pp-close\" onclick=\"closepp()\">x</a>";
            showPopup(markup, true);
        });

        $(".r-item-ttl").html("(" + $(".items-container .textbox").length + ")");
        $(".r-trink-ttl").html("(" + $(".trinkets-container .textbox").length + ")");
        $(".r-card-ttl").html("(" + $(".tarot-container .textbox").length + ")");
        $(".seeds .seed-ttl").html("(" + $(".seeds table tr").length + ")");

        $(".seeds-hide-img").on("click", function () {
            $(".seeds table img").toggle();
        });

        if (itemFilterController) {
            itemFilterController.applyFilters();
        }
    });
});
