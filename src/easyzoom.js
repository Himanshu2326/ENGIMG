(function ($) {

    'use strict';

    var dw, dh, rw, rh, lx, ly;

    var defaults = {

        // The text to display within the notice box while loading the zoom image.
        loadingNotice: 'Loading image',

        // The text to display within the notice box if an error occurs loading the zoom image.
        errorNotice: 'The image could not be loaded',

        // The time (in milliseconds) to display the error notice.
        errorDuration: 2500,

        // Prevent clicks on the zoom image link.
        preventClicks: true,

        // Callback function to execute when the flyout is displayed.
        onShow: undefined,

        // Callback function to execute when the flyout is removed.
        onHide: undefined

    };

    /**
     * EasyZoom
     * @constructor
     * @param {Object} target
     * @param {Object} options
     */
    function EasyZoom(target, options) {
        this.$target = $(target);
        this.opts = $.extend({}, defaults, options);

        if (this.isOpen === undefined) {
            this._init();
        }

        return this;
    }

    /**
     * Init
     * @private
     */
    EasyZoom.prototype._init = function() {
        var self = this;

        this.$link   = this.$target.find('a');
        this.$image  = this.$target.find('img');

        this.$flyout = $('<div class="easyzoom-flyout" />');
        this.$notice = $('<div class="easyzoom-notice" />');

        this.$target
            .on('mouseenter.easyzoom touchstart.easyzoom', function(e) {
                self.isMouseOver = true;

                if (!e.originalEvent.touches || e.originalEvent.touches.length === 1) {
                    e.preventDefault();
                    self.show(e, true);
                }
            })
            .on('mousemove.easyzoom touchmove.easyzoom', function(e) {
                if (self.isOpen) {
                    e.preventDefault();
                    self._move(e);
                }
            })
            .on('mouseleave.easyzoom touchend.easyzoom', function() {
                self.isMouseOver = false;

                if (self.isOpen) {
                    self.hide();
                }
            });

        if (this.opts.preventClicks) {
            this.$target.on('click.easyzoom', 'a', function(e) {
                e.preventDefault();
            });
        }
    };

    /**
     * Show
     * @param {MouseEvent|TouchEvent} e
     * @param {Boolean} testMouseOver
     */
    EasyZoom.prototype.show = function(e, testMouseOver) {
        var w1, h1, w2, h2;
        var self = this;

        if (! this.isReady) {
            this._load(this.$link.attr('href'), function() {
                if (self.isMouseOver || !testMouseOver) {
                    self.show(e);
                }
            });

            return;
        }

        this.$target.append(this.$flyout);

        w1 = this.$target.width();
        h1 = this.$target.height();

        w2 = this.$flyout.width();
        h2 = this.$flyout.height();

        dw = this.$zoom.width() - w2;
        dh = this.$zoom.height() - h2;

        rw = dw / w1;
        rh = dh / h1;

        this.isOpen = true;

        if (this.opts.onShow) {
            this.opts.onShow.call(this);
        }

        if (e) {
            this._move(e);
        }
    };

    /**
     * Load
     * @private
     * @param {String} href
     * @param {Function} callback
     */
    EasyZoom.prototype._load = function(href, callback) {
        var zoom = new Image();

        this.$target.addClass('is-loading').append(this.$notice.text(this.opts.loadingNotice));

        this.$zoom = $(zoom);

        zoom.onerror = $.proxy(function() {
            var self = this;

            this.$notice.text(this.opts.errorNotice);
            this.$target.removeClass('is-loading').addClass('is-error');

            this.detachNotice = setTimeout(function() {
                self.$notice.detach();
                self.detachNotice = null;
            }, this.opts.errorDuration);
        }, this);

        zoom.onload = $.proxy(function() {

            // IE may fire a load event even on error so check the image has dimensions
            if (!zoom.width) {
                return;
            }

            this.isReady = true;

            this.$notice.detach();
            this.$flyout.html(this.$zoom);
            this.$target.removeClass('is-loading').addClass('is-ready');

            callback();
        }, this);

        zoom.style.position = 'absolute';
        zoom.src = href;
    };

    /**
     * Move
     * @private
     * @param {Event} e
     */
    EasyZoom.prototype._move = function(e) {

        if (e.type.indexOf('touch') === 0) {
            var touchlist = e.touches || e.originalEvent.touches;
            lx = touchlist[0].pageX;
            ly = touchlist[0].pageY;
        }
        else {
            lx = e.pageX || lx;
            ly = e.pageY || ly;
        }

        var offset  = this.$target.offset();
        var pt = ly - offset.top;
        var pl = lx - offset.left;
        var xt = Math.ceil(pt * rh);
        var xl = Math.ceil(pl * rw);

        // Close if outside
        if (xl < 0 || xt < 0 || xl > dw || xt > dh) {
            this.hide();
        }
        else {
            this.$zoom.css({
                top:  '' + (xt * -1) + 'px',
                left: '' + (xl * -1) + 'px'
            });
        }

    };

    /**
     * Hide
     */
    EasyZoom.prototype.hide = function() {
        if (this.isOpen) {
            this.$flyout.detach();
            this.isOpen = false;

            if (this.opts.onHide) {
                this.opts.onHide.call(this);
            }
        }
    };

    /**
     * Swap
     * @param {String} standardSrc
     * @param {String} zoomHref
     * @param {String|Array} srcsetStringOrArray (Optional)
     */
    EasyZoom.prototype.swap = function(standardSrc, zoomHref, srcsetStringOrArray) {
        this.hide();
        this.isReady = false;

        if (this.detachNotice) {
            clearTimeout(this.detachNotice);
        }

        if (this.$notice.parent().length) {
            this.$notice.detach();
        }

        if ($.isArray(srcsetStringOrArray)) {
            srcsetStringOrArray = srcsetStringOrArray.join();
        }

        this.$target.removeClass('is-loading is-ready is-error');
        this.$image.attr({
            src: standardSrc,
            srcset: srcsetStringOrArray
        });
        this.$link.attr('href', zoomHref);
    };

    /**
     * Teardown
     */
    EasyZoom.prototype.teardown = function() {
        this.hide();

        this.$target.removeClass('is-loading is-ready is-error').off('.easyzoom');

        if (this.detachNotice) {
            clearTimeout(this.detachNotice);
        }

        delete this.$link;
        delete this.$zoom;
        delete this.$image;
        delete this.$notice;
        delete this.$flyout;

        delete this.isOpen;
        delete this.isReady;
    };

    // jQuery plugin wrapper
    $.fn.easyZoom = function(options) {
        return this.each(function() {
            var api = $.data(this, 'easyZoom');

            if (!api) {
                $.data(this, 'easyZoom', new EasyZoom(this, options));
            }
            else if (api.isOpen === undefined) {
                api._init();
            }
        });
    };

    // AMD and CommonJS module compatibility
    if (typeof define === 'function' && define.amd){
        define(function() {
            return EasyZoom;
        });
    }
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = EasyZoom;
    }

})(jQuery);
