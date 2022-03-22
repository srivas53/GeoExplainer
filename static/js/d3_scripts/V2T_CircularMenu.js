'use strict'; /* globals V2T */
(function(){

class CircularMenu extends V2T.Base {
    //TODO fix radius and thickness, for 50 and 30 the formula works for other values it is bugged
    constructor(coords, menu_holder_id, data_menu, radius=50, thickness=30){
        super();
        this.menu_holder_div = $('#' + menu_holder_id);
        this.radius = radius;
        this.thickness = thickness;

        this.menu_holder_div.attr("transform","translate(" + (coords.x - this.radius) + " ," + (coords.y - (this.radius/2)) + ")");

        this.data_menu = data_menu;

        this.menu = new d3.radialMenu().radius(radius)
        .thickness(thickness)
        .appendTo('#' + menu_holder_id);

        console.log(this.menu_holder_div);

    }

    showMenu(){
        this.menu.show(this.data_menu);
    }

    hideMenu(){
        this.menu.hide();
    }

    translateMenu(coords){
        this.menu_holder_div.attr("transform","translate(" + (coords.x - this.radius) + " ," + (coords.y - (this.radius/2)) + ")");
    }
}


// Expose CircularMenu
window.V2T.CircularMenu = CircularMenu;

})();
