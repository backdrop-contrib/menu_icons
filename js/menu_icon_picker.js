(function ($, Backdrop) {
    'use strict';

    var pickerState = {
        activeField: null,
        modal: null,
        results: null,
        search: null,
        pager: null,
        message: null,
        currentPage: 0,
        limit: 40,
        endpoint: '',
        loading: false
    };

    function buildModal() {
        if (pickerState.modal) {
            return;
        }
        var $modal = $(
            '<div class="menu-icon-picker-modal" role="dialog" aria-modal="true" aria-label="' + Backdrop.t('Choose an icon') + '">' +
            '<div class="menu-icon-picker-header">' +
            '<input type="search" class="menu-icon-picker-search" placeholder="' + Backdrop.t('Search icons') + '" aria-label="' + Backdrop.t('Search icons') + '">' +
            '<button type="button" class="button menu-icon-picker-close" aria-label="' + Backdrop.t('Close') + '">&times;</button>' +
            '</div>' +
            '<div class="menu-icon-picker-message"></div>' +
            '<div class="menu-icon-picker-results" role="listbox"></div>' +
            '<div class="menu-icon-picker-pager"></div>' +
            '</div>'
        );

        $('body').append($modal);
        pickerState.modal = $modal;
        pickerState.results = $modal.find('.menu-icon-picker-results');
        pickerState.search = $modal.find('.menu-icon-picker-search');
        pickerState.pager = $modal.find('.menu-icon-picker-pager');
        pickerState.message = $modal.find('.menu-icon-picker-message');

        $modal.on('click', '.menu-icon-picker-close', closeModal);
        $modal.on('click', '.menu-icon-picker-result', function (e) {
            e.preventDefault();
            var name = $(this).data('icon');
            if (pickerState.activeField) {
                pickerState.activeField.val(name).trigger('change');
                closeModal();
            }
        });

        pickerState.search.on('input', Backdrop.debounce(function () {
            pickerState.currentPage = 0;
            fetchIcons();
        }, 200));
    }

    function openModal($field, endpointOverride) {
        pickerState.activeField = $field;
        if (endpointOverride) {
            pickerState.endpoint = endpointOverride;
        }
        pickerState.modal.addClass('is-open');
        $('body').addClass('menu-icon-picker-open');
        pickerState.search.focus();
        fetchIcons();
    }

    function closeModal() {
        pickerState.modal.removeClass('is-open');
        $('body').removeClass('menu-icon-picker-open');
        pickerState.activeField = null;
    }

    function fetchIcons(page) {
        if (pickerState.loading) {
            return;
        }
        pickerState.loading = true;
        pickerState.message.text(Backdrop.t('Loading icons…'));
        pickerState.results.empty();
        if (typeof page === 'number') {
            pickerState.currentPage = page;
        }
        var query = pickerState.search.val() || '';
        $.getJSON(pickerState.endpoint, {
            search: query,
            page: pickerState.currentPage,
            limit: pickerState.limit
        }).done(function (data) {
            renderResults(data);
        }).fail(function (xhr) {
            var status = xhr && xhr.status ? xhr.status : 'error';
            var text = xhr && xhr.responseText ? xhr.responseText.substr(0, 120) : '';
            var msg = Backdrop.t('Unable to load icons (@status).', { '@status': status });
            if (text) {
                msg += ' ' + Backdrop.t('Response preview: @text', { '@text': text });
            }
            pickerState.message.text(msg);
            pickerState.results.empty();
        }).always(function () {
            pickerState.loading = false;
        });
    }

    function renderResults(data) {
        pickerState.results.empty();
        pickerState.message.text('');

        if (!data || !data.results || data.results.length === 0) {
            pickerState.message.text(Backdrop.t('No icons found.'));
            pickerState.pager.empty();
            return;
        }

        data.results.forEach(function (item) {
            var $btn = $('<button type="button" class="menu-icon-picker-result" role="option"></button>');
            $btn.attr('data-icon', item.name);
            $btn.append('<span class="menu-icon-picker-swatch">' + item.markup + '</span>');
            $btn.append('<span class="menu-icon-picker-name">' + Backdrop.checkPlain(item.name) + '</span>');
            pickerState.results.append($btn);
        });

        renderPager(data.total, data.page, data.limit);
    }

    function renderPager(total, page, limit) {
        pickerState.pager.empty();
        var totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) {
            return;
        }
        var $prev = $('<button type="button" class="button button-small" aria-label="' + Backdrop.t('Previous page') + '">' + Backdrop.t('Prev') + '</button>');
        var $next = $('<button type="button" class="button button-small" aria-label="' + Backdrop.t('Next page') + '">' + Backdrop.t('Next') + '</button>');
        $prev.prop('disabled', page <= 0);
        $next.prop('disabled', page >= totalPages - 1);
        $prev.on('click', function () {
            fetchIcons(page - 1);
        });
        $next.on('click', function () {
            fetchIcons(page + 1);
        });
        var status = $('<span class="menu-icon-picker-page-status"></span>').text(Backdrop.t('Page @page of @total', {
            '@page': page + 1,
            '@total': totalPages
        }));
        pickerState.pager.append($prev, status, $next);
    }

    Backdrop.behaviors.menuIconPicker = {
        attach: function (context, settings) {
            if (!settings.menuIconPicker || !settings.menuIconPicker.endpoint) {
                return;
            }
            pickerState.endpoint = settings.menuIconPicker.endpoint;
            pickerState.limit = settings.menuIconPicker.limit || 40;
            buildModal();

            $('.menu-icon-picker-launch', context).once('menu-icon-picker').each(function () {
                var target = $(this).data('target');
                var endpoint = $(this).data('endpoint');
                var $field = $('#' + target.replace(/[^A-Za-z0-9_-]/g, ''), context);
                $(this).on('click', function (e) {
                    e.preventDefault();
                    openModal($field, endpoint || pickerState.endpoint);
                });
            });
        }
    };
})(jQuery, Backdrop);
