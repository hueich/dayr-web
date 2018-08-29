var items = new Set();
var trades = new Set();
var fromMap = new Map();
var toMap = new Map();

Papa.parse('trade-data.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        console.log(results);

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
        console.log(items);
        console.log(trades);
        console.log(fromMap);
        console.log(toMap);

        var sortedItems = Array.from(items.values()).sort();
        console.log(sortedItems);
        $('#input-item option').remove();
        sortedItems.forEach(function(item) {
            $('#input-item').append($(document.createElement('option')).text(item));
        });
    }
});

var getRoutesTo = function(count, item, used, starting) {
    used = used || new Set();
    starting = starting || item;
    var routes = [];
    var tradables = toMap.get(item);
    if (!tradables) {
        return [];
    }
    tradables.forEach(function(trade) {
        if (used.has(trade) || (used.size > 0 && trade.ToItem == starting)) {
            return;
        }
        var fromCount = trade.FromCount * count / trade.ToCount;
        var transaction = {direction: 'from', count: fromCount, trade: trade};
        used.add(trade);
        var subRoutes = getRoutesTo(fromCount, trade.FromItem, used, starting);
        used.delete(trade);
        routes.push([transaction].concat(subRoutes));
    });
    if (routes.length == 1) {
        routes = routes[0];
    }
    return routes;
};

var getRoutesFrom = function(count, item, used, starting) {
    console.log('used:', used);
    console.log('starting:', starting);
    var used = used || new Set();
    var starting = starting || item;
    console.log('used:', used);
    console.log('starting:', starting);
    var routes = [];
    var tradables = fromMap.get(item);
    if (!tradables) {
        return [];
    }
    tradables.forEach(function(trade) {
        if (used.has(trade) || (used.size > 0 && trade.FromItem == starting)) {
            return;
        }
        var toCount = trade.ToCount * count / trade.FromCount;
        var transaction = {direction: 'to', count: toCount, trade: trade};
        console.log('transaction:', transaction);
        used.add(trade);
        var subRoutes = getRoutesFrom(toCount, trade.ToItem, used, starting);
        used.delete(trade);
        console.log('subRoutes:', subRoutes);
        routes.push([transaction].concat(subRoutes));
        console.log('routes:', routes);
    });
    if (routes.length == 1) {
        routes = routes[0];
    }
    return routes;
};

$('#input-route').click(function() {
    console.log('processing stuff...');
    if ($('#input-direction').val() == 'To') {
        var routes = getRoutesTo(parseInt($('#input-count').val()), $('#input-item').val());
        console.log(routes);
    } else {
        var routes = getRoutesFrom(parseInt($('#input-count').val()), $('#input-item').val());
        console.log(routes);
    }
});
