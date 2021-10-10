// Import Modules
import { exaltedthird } from "./config.js";

import { ExaltedThirdActor } from "./actor/actor.js";
import { ExaltedThirdActorSheet } from "./actor/actor-sheet.js";
import { ExaltedThirdItem } from "./item/item.js";
import { ExaltedThirdItemSheet } from "./item/item-sheet.js";

import { openRollDialogue } from "./apps/dice-roller.js";
import TraitSelector from "./apps/trait-selector.js";

Hooks.once('init', async function() {

  game.exaltedthird = {
    applications: {
      TraitSelector,
    },
    entities: {
      ExaltedThirdActor,
      ExaltedThirdItem,
    },
    config: exaltedthird,
    rollItemMacro: rollItemMacro
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // CONFIG.Combat.initiative = {
  //   formula: "1d10cs>=7",
  // };

  // Define custom Entity classes
  CONFIG.exaltedthird = exaltedthird;
  CONFIG.Actor.documentClass = ExaltedThirdActor;
  CONFIG.Item.documentClass = ExaltedThirdItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("exaltedthird", ExaltedThirdActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("exaltedthird", ExaltedThirdItemSheet, { makeDefault: true });

  // Pre-load templates
  loadTemplates([
    "systems/exaltedthird/templates/dialogues/ability-base.html",
    "systems/exaltedthird/templates/actor/active-effects.html",
    "systems/exaltedthird/templates/actor/equipment-list.html",
    "systems/exaltedthird/templates/actor/combat-tab.html",
    "systems/exaltedthird/templates/actor/charm-list.html",
    "systems/exaltedthird/templates/actor/intimacies-list.html",
  ]);

  Combatant.prototype._getInitiativeFormula = function() {
    const actor = this.actor;
    var initDice = 0;
    if (this.actor.type != 'npc') {
      initDice = actor.data.data.attributes.wits.value + actor.data.data.abilities.awareness.value + 2;
    }
    else {
      initDice = actor.data.data.pools.joinbattle.value;
    }
    let roll = new Roll(`${initDice}d10cs>=7 + 3`).evaluate({ async: false });
    let diceRoll = roll.total;
    let bonus = 0;
    for (let dice of roll.dice[0].results) {
      if (dice.result >= 10) {
          bonus++;
      }
    }
    return `${diceRoll + bonus}`;
  }

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  }); 

  Handlebars.registerHelper('numLoop', function (num, options) {
    let ret = ''

    for (let i = 0, j = num; i < j; i++) {
      ret = ret + options.fn(i)
    }

    return ret
  })
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

$(document).ready(() => {
  const diceIconSelector = '#chat-controls .chat-control-icon .fa-dice-d20';

  $(document).on('click', diceIconSelector, ev => {
    ev.preventDefault();
    openRollDialogue();
  });
});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createexaltedthirdMacro(data, slot));

  $("#chat-log").on("click", " .item-row", ev => {
    const li = $(ev.currentTarget).next();
    li.toggle("fast");
  });
  
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createexaltedthirdMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.exaltedthird.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "exaltedthird.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}