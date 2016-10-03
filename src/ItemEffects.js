'use strict';

var ins = {
    LITERAL: 0x00,
    DICE: 0x01,
    SUM: 0x02,
    STORE_VAL: 0x03,
    GET_INSTANCE_USE_NAME: 0x04,
    GET_INSTANCE_HEALTH: 0x05,
    SET_INSTANCE_HEALTH: 0x06,
    RETURN_MSG: 0x07
};

function rollDice(value) {
    var a = parseInt(value.substring(0, value.indexOf('D')), 10);
    var b = parseInt(value.substring(value.indexOf('D') + 1), 10);
    
    var ret = 0;
    for (var i=0;i<a;i++) {
        ret += ((Math.random() * (b - 1)) << 0) + 1;
    }
    
    return ret;
}

module.exports = {
    instructions: ins,
    
    executeCommand: function(command, params) {
        var copy = command.slice(0, command.length),
            stack = [],
            storedVals = [],
            i, msg = null;
        
        while (copy.length > 0) {
            i = copy.shift();
            
            switch (i) {
                case ins.LITERAL:
                    stack.push(copy.shift());
                    break;
                
                case ins.DICE:
                    stack.push(rollDice(copy.shift()));
                    break;
                    
                case ins.SUM:
                    stack.push(stack.pop() + stack.pop());
                    break;
                    
                case ins.STORE_VAL:
                    storedVals.push(stack[stack.length - 1]);
                    break;
                    
                case ins.GET_INSTANCE_USE_NAME:
                    stack.push(params.instance.useName);
                    break;
                    
                case ins.GET_INSTANCE_HEALTH:
                    stack.push(params.instance.hp[0]);
                    break;
                    
                case ins.SET_INSTANCE_HEALTH:
                    params.instance.hp[0] = Math.min(stack.pop(), params.instance.hp[1]);
                    break;
                    
                case ins.RETURN_MSG:
                    msg = copy.shift();
                    msg = msg.replace(/\%s[0-9]+/g, function(m, v) {
                        var ind = parseInt(m.replace("%s", ""), 10);
                        return storedVals[ind] || m;
                    });
                    
                    break;
            }
        }
        
        return msg;
    },
    
    items: {
        hpPotion: [ ins.GET_INSTANCE_USE_NAME, ins.STORE_VAL, ins.GET_INSTANCE_HEALTH, ins.DICE, '3D10', ins.STORE_VAL, ins.SUM, ins.SET_INSTANCE_HEALTH, ins.RETURN_MSG, "%s0 recovered %s1 health points." ]
    }
};