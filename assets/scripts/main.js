function sC(e, t, n) {
    var i = new Date;
    i.setTime(i.getTime() + n * 24 * 60 * 60 * 1e3);
    var s = "expires=" + i.toGMTString();
    document.cookie = e + "=" + t + "; " + s;
}

function gC(e) {
    var t = e + "=";
    var n = document.cookie.split(";");
    for (var r = 0; r < n.length; r++) {
        var i = n[r].trim();
        if (i.indexOf(t) == 0) {
            return i.substring(t.length, i.length);
        }
    }
    return "";
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}

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

function escapeHtml(value) {
    return $("<div>").text(value == null ? "" : String(value)).html();
}

function localizeMetaValue(value, localeCode) {
    if (localeCode !== "zh-CN") {
        return value;
    }

    var replacements = {
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

    if ($.isArray(value)) {
        return $.map(value, function (entry) {
            return replacements[entry] || entry;
        });
    }

    return replacements[value] || value;
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
        parts.push("<p>" + typeLabel + ": " + escapeHtml(localizeMetaValue(meta.type, localeCode)) + "</p>");
    }
    if (meta["recharge time"]) {
        parts.push("<p>" + rechargeLabel + ": " + escapeHtml(localizeMetaValue(meta["recharge time"], localeCode)) + "</p>");
    }
    if (meta.itemPools && meta.itemPools.length) {
        parts.push("<p>" + poolLabel + ": " + escapeHtml(localizeMetaValue(meta.itemPools, localeCode).join(", ")) + "</p>");
    }

    $.each(meta, function (key, value) {
        if (key === "type" || key === "recharge time" || key === "itemPools") {
            return;
        }
        parts.push("<p>" + escapeHtml(key) + ": " + escapeHtml(localizeMetaValue(value, localeCode)) + "</p>");
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

function findItemFromID(id) {
    var val = id.toString();
    var node = $("body").find("[data-sid='" + val + "']");
    if (node.html() === undefined) {
        return "<p>Invalid item ID!</p>";
    }
    if (val == "278") {
        return node.html() + "<a id=\"DankBumLink\" href=\"dark-bum\"></a>";
    } else if (val == "331") {
        return node.html() + "<a id=\"IlluminatiLink\" href=\"109\"></a>";
    } else if (val == "429") {
        return node.html() + "<a id=\"ButtLink\" href=\"ultra-butt\"></a>";
    } else {
        return node.html();
    }
}

function closepp() {
    var k = document.getElementById("popup");
    document.getElementById("darkback").style.display = "none";
    k.style.display = "none";
    k.innerHTML = "";
}

function initpp() {
    var chk = getQueryVariable("id");
    if (chk !== false) {
        var markup = findItemFromID(chk);
        markup += "<a class=\"pp-close\" onclick=\"closepp()\">x</a>";
        var node = document.getElementById("popup");
        node.innerHTML = markup;
        node.style.display = "block";
        document.getElementById("darkback").style.display = "block";
    }
}

$(document).ready(function () {
    loadAndApplyLocale("zh-CN").always(function () {
        initpp();

        var bounceRate = $(window).width() > 1000 ? 250 : 500;
        $.ajaxSetup({
            cache: false
        });

        jQuery.expr[":"].Contains = function (a, i, m) {
            return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
        };

        function filterList(list) {
            var form = $("header .container .search form");
            var input = $(".search-input");

            $(form).on("submit", function (event) {
                event.preventDefault();
            });

            $(input).change(_.debounce(function () {
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
                return false;
            }, bounceRate)).keyup(function () {
                $(this).change();
            });
        }

        $(function () {
            filterList($(".main"));
        });

        function tog(v) {
            return v ? "addClass" : "removeClass";
        }

        $(document).on("keydown", function () {
            if (!$(".search-input").is(":focus")) {
                $(".search-input").focus();
            }
        });

        $(document).on("input", "header .container .search input[type=text]", function () {
            $(this)[tog(this.value)]("x");
        }).on("mousemove", ".x", function (e) {
            $(this)[tog(this.offsetWidth - 30 < e.clientX - this.getBoundingClientRect().left)]("onX");
        }).on("click", ".onX", function () {
            $(this).removeClass("x onX").val("");
            $(".main").find("li").fadeIn("fast");
            $(".main").find("li").removeClass("fade");
        });

        $(".option-expander").click(function () {
            if ($(".option-container").css("display") == "block") {
                $(".option-container").slideUp(200, "easeOutElastic");
            } else {
                $(".option-container").slideDown(200, "easeOutElastic");
            }
        });

        $(".mobile-nav").click(function () {
            if ($(".mobile-nav-container").css("display") == "block") {
                $(".mobile-nav-container").slideUp(200, "easeOutElastic");
            } else {
                $(".mobile-nav-container").slideDown(200, "easeOutElastic");
            }
        });

        $("input[name=size]").click(function () {
            if ($("#small").is(":checked")) {
                $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item")
                    .removeClass("large")
                    .addClass("small");
            } else if ($("#medium").is(":checked")) {
                $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item")
                    .removeClass("small")
                    .removeClass("large");
            }
        });

        $("input[name=sort]").click(function () {
            if ($("#itemid").is(":checked")) {
                $(".textbox").tsort({ attr: "data-sid" });
            } else if ($("#colour").is(":checked")) {
                $(".textbox").tsort({ attr: "data-cid" });
            } else if ($("#alphabet").is(":checked")) {
                $(".textbox").tsort({ attr: "data-tid" });
            }
        });

        $("input[name=spacing]").click(function () {
            if ($("#closer").is(":checked")) {
                $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item").addClass("closer");
            } else if ($("#spaced").is(":checked")) {
                $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item").removeClass("closer");
            }
        });

        $(".nav-dd").hover(function () {
            $(this).next("ul").addClass("shown");
        }, function () {
            $(this).next("ul").removeClass("shown");
        });

        $(".textbox").click(function () {
            var val = $(this).data("sid");
            var markup = "";

            if (val == 278) {
                markup = $(this).children().html() + "<a id=\"DankBumLink\" href=\"dark-bum\"></a>";
            } else if (val == 331) {
                markup = $(this).children().html() + "<a id=\"IlluminatiLink\" href=\"109\"></a>";
            } else if (val == 429) {
                markup = $(this).children().html() + "<a id=\"ButtLink\" href=\"ultra-butt\"></a>";
            } else {
                markup = $(this).children().html();
            }

            markup += "<a class=\"pp-close\" onclick=\"closepp()\">x</a>";
            var node = document.getElementById("popup");
            node.innerHTML = markup;
            $(".itm-popup").slideDown();
            $(".overlay").fadeIn();
        });

        var tempitm = $(".items-container .textbox").size();
        $(".r-item-ttl").html("(" + tempitm + ")");
        var temptrink = $(".trinkets-container .textbox").size();
        $(".r-trink-ttl").html("(" + temptrink + ")");
        var tempcard = $(".tarot-container .textbox").size();
        $(".r-card-ttl").html("(" + tempcard + ")");
        var tempseed = $(".seeds table tr").size();
        $(".seeds .seed-ttl").html("(" + tempseed + ")");

        $(".seeds-hide-img").click(function () {
            $(".seeds table img").toggle();
        });
    });
});

$(document).mouseup(function (e) {
    var container = $(".option-container");
    var mobile_nav = $(".mobile-nav-container");
    var popit = $(".itm-popup");
    if (!container.is(e.target) && container.has(e.target).length === 0) {
        container.slideUp(600, "easeOutElastic");
    }
    if (!mobile_nav.is(e.target) && mobile_nav.has(e.target).length === 0) {
        mobile_nav.slideUp(600, "easeOutElastic");
    }
    if (!popit.is(e.target) && popit.has(e.target).length === 0) {
        popit.fadeOut();
        $(".overlay").fadeOut();
    }
});

function cCo() {
    var ta = gC("sort");
    var id = document.getElementById("itemid");
    var cl = document.getElementById("colour");
    var az = document.getElementById("alphabet");
    if (ta == "id") {
        $(".textbox").tsort({ attr: "data-sid" });
        if (az && id && cl) {
            az.checked = false;
            cl.checked = false;
            id.checked = true;
        }
    } else if (ta == "co") {
        $(".textbox").tsort({ attr: "data-cid" });
        if (az && id && cl) {
            az.checked = false;
            cl.checked = true;
            id.checked = false;
        }
    } else if (ta == "az") {
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
    if (fi == "f") {
        if (rm && fa) {
            rm.checked = false;
            fa.checked = true;
        }
    } else if (fi == "r") {
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
    if (z == "s") {
        if (y && x) {
            $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item")
                .removeClass("large")
                .addClass("small");
            y.checked = true;
            x.checked = false;
        }
    } else {
        if (y && x) {
            $(".item, .rebirth-item, .rep-item, .rebirth-trinket, .rebirth-card, .a-item, .ap-item, .anb-item")
                .removeClass("small")
                .removeClass("large");
            y.checked = false;
            x.checked = true;
        }
    }
}

cCo();
