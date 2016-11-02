/*
 * This Message object process the response from server and fire
 * events based on type of response
 */
var MBMessage = (function () {
    'use strict';

    var process = function (msg) {
        var response = JSON.parse(msg.data);
        if(!MBTradePage.is_trading_page()){
            forgetTradingStreams();
            return;
        }
        if (response) {
            var type = response.msg_type;
            if (type === 'active_symbols') {
                MBProcess.processActiveSymbols(response);
            } else if (type === 'contracts_for') {
                MBContract.setContractsResponse(response);
                MBProcess.processContract(response);
            } else if (type === 'payout_currencies' && response.hasOwnProperty('echo_req') && (!response.echo_req.hasOwnProperty('passthrough') || !response.echo_req.passthrough.hasOwnProperty('handler'))) {
                page.client.set_storage_value('currencies', response.payout_currencies);
                MBDisplayCurrencies('', false);
                MBSymbols.getSymbols(1);
            } else if (type === 'proposal') {
                MBProcess.processProposal(response);
            } else if (type === 'buy') {
                MBPurchase.display(response);
                GTM.push_purchase_data(response);
            } else if (type === 'tick') {
                MBProcess.processTick(response);
            } else if (type === 'history') {
                MBTick.processHistory(response);
            } else if (type === 'trading_times'){
                processTradingTimes(response);
            } else if(type === 'portfolio'){
                PortfolioWS.updatePortfolio(response);
            } else if(type === 'proposal_open_contract'){
                PortfolioWS.updateIndicative(response);
            } else if(type === 'transaction'){
                PortfolioWS.transactionResponseHandler(response);
            }
        }
    };

    return {
        process: process
    };
})();

module.exports = {
    MBMessage: MBMessage,
};