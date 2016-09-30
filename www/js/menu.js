module.exports = L.Control.SlideMenu.extend({
    options: {
        position: 'topleft'
    },
    initialize: function (menu, options) {
      this._menuObj = menu;
      var m = menu.reduce(
        function (lis, item, index) {
          return lis
            + '<li role="presentation" class="active" data-index="'
            + index
            + '"><a href="#">'
            + item[0]
            + '</a></li>';
        },
        '<ul class="nav nav-pills nav-stacked" style="padding-top: 1em">'
      ) + '</ul>';
      L.Control.SlideMenu.prototype.initialize.call(this, m, options);
    },
    onAdd: function (map) {
      var container = L.Control.SlideMenu.prototype.onAdd.call(this, map);
      $(this._contents).find('li').click(this._onClick.bind(this));
      return container;
    },
    _onClick: function (ev) {
      L.DomEvent.stopPropagation(ev);
      var index = $(ev.currentTarget).data('index');
      this.close();
      return this._menuObj[index][1](ev);
    },
    open: function () {
      this._animate(this._menu, this._startPosition, 0, true);
    },
    close: function () {
      this._animate(this._menu, 0, this._startPosition, false);
    }
});
