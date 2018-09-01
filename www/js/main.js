const Directions = Object.freeze({
    TO: Symbol("to"),
    FROM: Symbol("from")
});

var tradeDataPath = 'data/trade-data.csv';

var items = new Set();
var trades = new Set();
var fromMap = new Map();
var toMap = new Map();

Papa.parse(tradeDataPath, {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
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
    }
});

$('#input-form').submit(function(event) {
    event.preventDefault();
    $('#error-message').empty();
    var direction = $('#input-direction').val() == 'To' ? Directions.TO : Directions.FROM;
    var tradeMap = direction === Directions.TO ? toMap : fromMap;
    var count = parseInt($('#input-count').val());
    var item = $('#input-item').val();
    var mainGraph = $('#main-graph').empty();
    var routes = getRoutes(direction, count, item, tradeMap, mainGraph);
    if (routes.length == 0) {
        $('#error-message').text('No routes found!');
    }
});

var getRoutes = function(direction, count, item, tradeMap, parent, used, starting) {
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
        var newCount = dstCount * multiplier;
        var transaction = {direction: direction, mult: multiplier, trade: trade};
        var node = createNode(transaction);
        if (direction === Directions.FROM || !parent.hasClass('node')) {
            parent.append(node);
        } else {
            parent.parent().append(node);
            node.append(parent.detach());
        }
        used.add(trade);
        var subRoutes = getRoutes(direction, newCount, dstItem, tradeMap, node, used, starting);
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
}
