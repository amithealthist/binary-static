const moment               = require('moment');
const BinarySocket         = require('../../../socket');
const BinaryPjax           = require('../../../../base/binary_pjax');
const Client               = require('../../../../base/client');
const showLocalTimeOnHover = require('../../../../base/clock').showLocalTimeOnHover;
const localize             = require('../../../../base/localize').localize;
const State                = require('../../../../base/storage').State;
const FlexTableUI          = require('../../../../common_functions/attach_dom/flextable');
const elementTextContent   = require('../../../../common_functions/common_functions').elementTextContent;
const jpClient             = require('../../../../common_functions/country_base').jpClient;
const toTitleCase          = require('../../../../common_functions/string_util').toTitleCase;

const AuthorisedApps = (() => {
    let can_revoke = false;

    const messages = {
        no_apps       : 'You have not granted access to any applications.',
        revoke_confirm: 'Are you sure that you want to permanently revoke access to application',
        revoke_access : 'Revoke access',
    };

    const element_ids = {
        container: 'applications-container',
        table    : 'applications-table',
        loading  : 'applications_loading',
        error    : 'applications_error',
    };

    const elements = {};

    const onLoad = () => {
        if (jpClient()) {
            BinaryPjax.loadPreviousUrl();
            return;
        }
        Object.keys(element_ids).forEach((id) => {
            elements[id] = document.getElementById(element_ids[id]);
        });
        updateApps();
    };

    const updateApps = () => {
        BinarySocket.send({ oauth_apps: 1 }).then((response) => {
            if (response.error) {
                if (/InvalidToken/.test(response.error.code)) { // if application revoked is current application, log client out
                    Client.sendLogoutRequest(true);
                } else {
                    displayError(response.error.message);
                }
            } else {
                const apps = response.oauth_apps.map(app => ({
                    name     : app.name,
                    scopes   : app.scopes,
                    last_used: app.last_used ? moment.utc(app.last_used) : null,
                    id       : app.app_id,
                }));
                if (elements.loading) elements.loading.remove();
                createTable(apps);
                if (!apps.length) {
                    FlexTableUI.displayError(localize(messages.no_apps), 7);
                }
            }
        });
    };

    const formatApp = (app) => {
        const last_used = app.last_used ? app.last_used.format('YYYY-MM-DD HH:mm:ss') : localize('Never');
        const scopes    = app.scopes.map(scope => localize(toTitleCase(scope))).join(', ');
        const data      = [app.name, scopes, last_used];
        if (can_revoke) {
            data.push(''); // for the "Revoke App" button
        }
        return data;
    };

    const createRevokeButton = (container, app) => {
        const $button = $('<button/>', { class: 'button', text: localize(messages.revoke_access) });
        $button.on('click', () => {
            if (window.confirm(`${localize(messages.revoke_confirm)}: '${app.name}'?`)) {
                BinarySocket.send({ revoke_oauth_app: app.id }).then((response) => {
                    if (response.error) {
                        displayError(response.error.message);
                    } else {
                        updateApps();
                    }
                });
                container.css({ opacity: 0.5 });
            }
        });
        return $button;
    };

    const createTable = (data) => {
        if (elements.table) {
            return FlexTableUI.replace(data);
        }
        const headers = ['Name', 'Permissions', 'Last Used'];
        can_revoke    = /admin/.test((State.getResponse('authorize') || {}).scopes);
        if (can_revoke) {
            headers.push('Action');
        }
        FlexTableUI.init({
            data,
            container: `#${element_ids.container}`,
            header   : headers.map(localize),
            id       : element_ids.table,
            cols     : headers.map(title => title.toLowerCase().replace(/\s/g, '-')),
            style    : ($row, app) => {
                if (can_revoke) {
                    $row.children('.action').first().append(createRevokeButton($row, app));
                }
            },
            formatter: formatApp,
        });
        elements.table = document.getElementById(element_ids.table);
        return showLocalTimeOnHover('td.last_used');
    };

    const displayError = (message) => {
        elementTextContent(elements.error, message);
    };

    const onUnload = () => {
        elementTextContent(elements.error, '');
        FlexTableUI.clear();
    };

    return {
        onLoad,
        onUnload,
    };
})();

module.exports = AuthorisedApps;
