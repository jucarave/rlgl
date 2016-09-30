'use strict';

var Colors = require('./Colors');
var Console = require('./Console');

module.exports = {
    name: 'KRAM',
    class: 'ROGUE',
    
    level: 1,
    
    hp: [45, 80],
    mp: [18, 20],
    status: null,
    
    str: '3D5',
    def: '2D4',
    spd: 2,
    
    gold: 0,
    
    inventory: [],
    equipment: {
        rhand: null,
        lhand: null,
        armor: null,
        amulet: null
    },
    
    statsPosition: [60, 0, 25, 25, 73],
    
    renderText: function(renderer, x, y, text, color=Colors.WHITE, backColor=Colors.BLACK) {
        for (var i=0,t;t=text[i];i++) {
            renderer.plot(x + i, y, Console.getTile(renderer, t, color, backColor));
        }
    },
    
    render: function(renderer) {
        var sp = this.statsPosition,
            i, l;
        
        renderer.clearRect(sp[0], sp[1], sp[2], sp[3]);
        
        // Player Name
        var name = this.name + " (" + this.class + ")";
        
        var x = (sp[4] - name.length / 2) << 0;
        var ni = 0;
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++) {
            var n = '';
            if (i >= x && ni < name.length){ n = name[ni++]; }
            
            renderer.plot(i, 0, Console.getTile(renderer, n, Colors.WHITE, Colors.BLUE));
        }
        
        // Dungeon Depth
        this.renderText(renderer, sp[0], 1, "LEVEL: " + this.level);
        
        // Health Points
        var hp = ((this.hp[0] / this.hp[1] * sp[2]) << 0) + sp[0];
        for (i=sp[0];i<hp;i++){
            renderer.plot(i, 2, renderer.getTile(Colors.GREEN));
        }
        
        this.renderText(renderer, sp[0], 2, "HP: " + this.hp[0] + "/" + this.hp[1], Colors.WHITE, Colors.GREEN);
        
        // Magic Points
        var mp = ((this.mp[0] / this.mp[1] * sp[2]) << 0) + sp[0];
        for (var i=sp[0];i<mp;i++){
            renderer.plot(i, 3, renderer.getTile(Colors.AQUA));
        }
        
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 4, renderer.getTile(Colors.BLACK));
        }
        this.renderText(renderer, sp[0], 4, "STATUS: FINE", Colors.WHITE, Colors.BLACK);
        
        this.renderText(renderer, sp[0], 3, "MP: " + this.mp[0] + "/" + this.mp[1], Colors.WHITE, Colors.AQUA);
        
        this.renderText(renderer, sp[0], 5, "ATK: " + this.str, Colors.WHITE, Colors.BLACK);
        this.renderText(renderer, (sp[0] + sp[2] / 2) << 0, 5, "DEF: " + this.def, Colors.WHITE, Colors.BLACK);
        
        this.renderText(renderer, sp[0], 6, "SPD: " + this.spd, Colors.WHITE, Colors.BLACK);
        this.renderText(renderer, (sp[0] + sp[2] / 2 - 1) << 0, 6, "GOLD: " + this.gold, Colors.YELLOW, Colors.BLACK);
        
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 7, renderer.getTile(Colors.BLUE));
        }
        this.renderText(renderer, sp[0] + 8, 7, "EQUIPMENT", Colors.WHITE, Colors.BLUE);
        
        var equip = (this.equipment.rhand)? this.equipment.rhand : 'RIGHT HAND';
        this.renderText(renderer, sp[0], 8, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.lhand)? this.equipment.lhand : 'LEFT HAND';
        this.renderText(renderer, sp[0], 9, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.armor)? this.equipment.armor : 'NO ARMOR';
        this.renderText(renderer, sp[0], 10, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.amulet)? this.equipment.amulet : 'NO AMULET';
        this.renderText(renderer, sp[0], 11, equip, Colors.WHITE, Colors.BLACK);
    }
};