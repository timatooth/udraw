/**
 * Created by tim on 17/02/16.
 */

// http://codereview.stackexchange.com/questions/79114/custom-event-hub
export default class EventHub {
    constructor(){
        this._handlers = {}
        this._running = false;
    }

    // delays the execution of fn while Hub is triggering custom events (_running === true)
    _delay(fn){
        var hub, interval, id;

        hub = this;
        interval = 0;

        // setInterval(fn,0) is the JS equivalent for while(true){}
        // the actual while(true) will certainly kill the process
        id = setInterval(function(){

            if (!this._running) {
                fn.call(hub);
                clearInterval(id);
            }

        }, interval);
    }

    on(name, callback, context) {
        this._delay(function Hub_on_delayed (){

            var handler;

            if (!Array.isArray(this._handlers[name])) {
                this._handlers[name] = [];
            }

            handler = {};
            handler.callback = callback;
            handler.context  = context;

            this._handlers[name].push(handler);

        });

    }

    off(name, callback, context){
        this._delay(function Hub_off_delayed (){

            if (!Array.isArray(this._handlers[name])) {
                this._handlers[name] = [];
            }

            this._handlers[name] = this._handlers[name].filter(function(handler){
                return !(handler.callback === callback && handler.context === context);
            });

        });
    }

    trigger(name){
        var args, i, handlers, callback, context, invoke;

        // delay asynchronous registering and unregistering
        this._running = true;

        args = Array.prototype.slice.call (arguments, 1);
        handlers = Array.isArray(this._handlers[name]) ? this._handlers[name] : [];

        for (i = 0; i < handlers.length; i++) {

            callback = handlers[i].callback;
            context  = handlers[i].context;

            // allow invokation only fo valid callbacks and contexts
            invoke = (
                typeof callback === "function"
                //&& typeof context !== "undefined" //allow null/undefined to pass through
                //&& context !== null
            );

            if (invoke === true) {
                callback.apply(context, args);
            }
        }

        // allow registering and unregistering
        this._running = false;
    }




}