function sC(e, t, n) {
    var i = new Date();
    i.setTime(i.getTime() + n * 24 * 60 * 60 * 1e3);
    var s = "expires=" + i.toGMTString();
    document.cookie = e + "=" + t + "; " + s;
}

function gC(e) {
    var t = e + "=";
    var n = document.cookie.split(";");
    for (var r = 0; r < n.length; r++) {
        var i = n[r].trim();
        if (i.indexOf(t) === 0) {
            return i.substring(t.length, i.length);
        }
    }
    return "";
}

function getQueryVariable(variable) {
    var params = new URLSearchParams(window.location.search);
    if (!params.has(variable)) {
        return false;
    }

    var value = $.trim(params.get(variable) || "");
    return value ? value : false;
}

$(document).ready(function () {
    var $optionContainer = $(".option-container");
    var $mobileNavContainer = $(".mobile-nav-container");
    var $filterPopover = $(".item-filter-popover");
    var $popup = $(".itm-popup");
    var $overlay = $(".overlay");

    function togglePanel($panel) {
        if (!$panel.length) {
            return;
        }

        if ($panel.css("display") === "block") {
            $panel.stop(true, true).slideUp(200, "easeOutElastic");
        } else {
            $panel.stop(true, true).slideDown(200, "easeOutElastic");
        }
    }

    $(".option-expander").on("click", function () {
        togglePanel($optionContainer);
    });

    $(".mobile-nav").on("click", function () {
        togglePanel($mobileNavContainer);
    });

    $(".nav-dd").hover(function () {
        $(this).next("ul").addClass("shown");
    }, function () {
        $(this).next("ul").removeClass("shown");
    });

    $(document).on("mouseup", function (e) {
        if ($optionContainer.length && !$optionContainer.is(e.target) && $optionContainer.has(e.target).length === 0) {
            $optionContainer.stop(true, true).slideUp(600, "easeOutElastic");
        }
        if ($mobileNavContainer.length && !$mobileNavContainer.is(e.target) && $mobileNavContainer.has(e.target).length === 0) {
            $mobileNavContainer.stop(true, true).slideUp(600, "easeOutElastic");
        }
        if ($popup.length && !$popup.is(e.target) && $popup.has(e.target).length === 0) {
            $popup.stop(true, true).fadeOut();
            $overlay.stop(true, true).fadeOut();
        }
        if ($filterPopover.length && !$filterPopover.is(e.target) && $filterPopover.has(e.target).length === 0) {
            $filterPopover.removeClass("is-open");
        }
    });
});
