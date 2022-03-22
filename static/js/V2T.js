'use strict';  /* globals V2T */ // you can list here global variables such as $ or D3
(function(){

// GLobal V2T stuff

// Every class of V2T should inherit from Base to implement the observer pattern
class Base {

    constructor(){
        this.listenersPerEvent = new Map();
    }

    on(event, callback){
        if(!this.listenersPerEvent.has(event))
            this.listenersPerEvent.set(event, []);
        let listeners = this.listenersPerEvent.get(event);
        listeners.push(callback);
        console.log("Event ", event, "was observed", callback);
    }

    off(event, callback){
        if(!this.listenersPerEvent.has(event))
            return;
        let listeners = this.listenersPerEvent.get(event);
        for(let i=listeners.length-1; i>=0; i--)
            if(listeners[i]===callback)
                listeners[i].splice(i,1);
    }

    trigger(event, data){
        if(!this.listenersPerEvent.has(event))
            return;

        let listeners = this.listenersPerEvent.get(event);
        for(let i=0; i<listeners.length; i++)
            listeners[i](data);
        console.log("Event ", event, "was triggered");
    }

}

// This way only selected elements from the source code are exposed
window.V2T = {};
window.V2T.Base = Base;

})();