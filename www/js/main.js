'use strict';

const Directions = Object.freeze({
    TO: Symbol('to'),
    FROM: Symbol('from')
});

const tradeDataPaths = [
    ['v.593', 'data/trade-data-v593.csv'],
    ['v.574', 'data/trade-data-v574.csv'],
];

var tradeDataMap = new Map();
var items = new Set();
var trades = new Set();
var fromMap = new Map();
var toMap = new Map();

var init = function() {
    tradeDataPaths.forEach(function(pair) {
        tradeDataMap.set(pair[0], pair[1]);
        $('#input-version').append($(document.createElement('option')).text(pair[0]));
    });
    bindEvents();
    $('#input-version').change();
};

var bindEvents = function() {
    $('#input-version').change(function(event) {
        clearError();
        $('#main-graph').empty();
        $('#input-item').empty().append($(document.createElement('option')).text('Loading...'));
        var dataPath = tradeDataMap.get($(event.target).val());
        if (!dataPath) {
            showError('Version not found!');
            return;
        }
        loadData(dataPath, updateTable);
    });

    $('#input-form').submit(function(event) {
        event.preventDefault();
        clearError();
        var direction = $('#input-direction').val() == 'Want' ? Directions.TO : Directions.FROM;
        var tradeMap = direction === Directions.TO ? toMap : fromMap;
        var count = parseInt($('#input-count').val());
        var item = $('#input-item').val();
        var fractional = $('#input-fractional:checked').val() === 'fractional';
        var mainGraph = $('#main-graph').empty();
        var routes = getRoutes(direction, count, item, fractional, tradeMap, mainGraph);
        if (routes.length == 0) {
            showError('No routes found!');
        }
    });

    $('#input-table-button').click(function() {
        if($('#input-table-button').val() === 'show') {
            $('#input-table-button').val('hide');
            $('#trade-table').removeClass('hidden');
        } else {
            $('#input-table-button').val('show');
            $('#trade-table').addClass('hidden');
        }
    });
};

var loadData = function(tradeDataPath, callback) {
    Papa.parse(tradeDataPath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            items.clear();
            trades.clear();
            fromMap.clear();
            toMap.clear();

            results.data.forEach(function(row) {
                trades.add(row);
                items.add(row.FromItem);
                items.add(row.ToItem);

                if (!fromMap.has(row.FromItem)) {
                    fromMap.set(row.FromItem, new Set());
                }
                fromMap.get(row.FromItem).add(row);

                if (!toMap.has(row.ToItem)) {
                    toMap.set(row.ToItem, new Set());
                }
                toMap.get(row.ToItem).add(row);
            });

            var sortedItems = Array.from(items.values()).sort();
            var select = $('#input-item').empty();
            sortedItems.forEach(function(item) {
                select.append($(document.createElement('option')).text(item));
            });

            callback(trades);
        },
        error: function(error) {
            showError(error.message);
        },
    });
};

var updateTable = function(trades) {
    var tradeTable = $('#trade-table').empty();
    var prevLoc = "";
    var curCard = null;
    trades.forEach(function(trade) {
        console.log('prevLoc:', prevLoc);
        console.log('trade.Location:', trade.Location);
        if (prevLoc != trade.Location) {
            curCard = $(document.createElement('table')).addClass('table-card');
            var locCell = $(document.createElement('th')).attr('colspan', 5).text(trade.Location);
            var headRow = $(document.createElement('tr')).addClass('table-location');
            headRow.append(locCell);
            curCard.append(headRow);;
            tradeTable.append(curCard);
            prevLoc = trade.Location;
        }
        var row = $(document.createElement('tr')).addClass('table-trade');
        row.append($(document.createElement('td')).addClass('row-count').text(trade.FromCount));
        row.append($(document.createElement('td')).addClass('row-item').html(`<a href="https://dayr.wikia.com/wiki/${trade.FromItem}" target="_blank">${trade.FromItem}</a>`));
        row.append($(document.createElement('td')).text('⇒'));
        row.append($(document.createElement('td')).addClass('row-count').text(trade.ToCount));
        row.append($(document.createElement('td')).addClass('row-item').html(`<a href="https://dayr.wikia.com/wiki/${trade.ToItem}" target="_blank">${trade.ToItem}</a>`));
        // row.html(`${trade.FromCount} <a href="https://dayr.wikia.com/wiki/${trade.FromItem}" target="_blank">${trade.FromItem}</a> ⇒ ${trade.ToCount} <a href="https://dayr.wikia.com/wiki/${trade.ToItem}" target="_blank">${trade.ToItem}</a>`);
        curCard.append(row);
    });
};

var getRoutes = function(direction, count, item, fractional, tradeMap, parent, used, starting) {
    var used = used || new Set();
    var starting = starting || item;
    var routes = [];
    var tradables = tradeMap.get(item);
    if (!tradables) {
        return [];
    }
    tradables.forEach(function(trade) {
        if (direction === Directions.TO) {
            var srcCount = trade.ToCount;
            var srcItem = trade.ToItem;
            var dstCount = trade.FromCount;
            var dstItem = trade.FromItem;
        } else {
            var srcCount = trade.FromCount;
            var srcItem = trade.FromItem;
            var dstCount = trade.ToCount;
            var dstItem = trade.ToItem;
        }
        if (used.has(trade) || (used.size > 0 && srcItem == starting)) {
            return;
        }
        var multiplier = count / srcCount;
        if (!fractional) {
            if (direction === Directions.TO) {
                multiplier = Math.ceil(multiplier);
            } else {
                multiplier = Math.floor(multiplier);
            }
        }
        var newCount = dstCount * multiplier;
        var transaction = {direction: direction, mult: multiplier, trade: trade};
        var node = createNode(transaction);
        parent.append(node);
        used.add(trade);
        var subRoutes = getRoutes(direction, newCount, dstItem, fractional, tradeMap, node, used, starting);
        used.delete(trade);
        routes.push([transaction].concat(subRoutes));
    });
    return routes;
};

var createNode = function(transaction) {
    var trade = transaction.trade;
    var fromCount = transaction.mult * trade.FromCount;
    var toCount = transaction.mult * trade.ToCount;
    var node = $(document.createElement('div'));
    node.addClass('node');
    node.html(`${fromCount} <a href="https://dayr.wikia.com/wiki/${trade.FromItem}" target="_blank">${trade.FromItem}</a> ⇒ ${toCount} <a href="https://dayr.wikia.com/wiki/${trade.ToItem}" target="_blank">${trade.ToItem}</a> @ ${trade.Location}`);
    return node;
};

var showError = function(message) {
    $('#error-message').text(message);
};

var clearError = function() {
    $('#error-message').empty();
}

init();
