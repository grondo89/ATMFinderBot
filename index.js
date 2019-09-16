import fs from "fs";
import { convertArrayToCSV } from "convert-array-to-csv";
import { bancosLink, bancosBanelco, bankList } from "./setup";
import TelegramBot from "node-telegram-bot-api";

const token = "621165927:AAH-1ipYw2dafvDonEsFPSXoVq5Ush5P0yo";
const bot = new TelegramBot(token, { polling: true });
let bankNetwork = "";

let botScript = function() {
  bot.onText(/\/start/, msg => {
    const opts = {
      reply_markup: JSON.stringify({
        keyboard: [["Link", "Banelco"]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    };
    bot.sendMessage(
      msg.chat.id,
      "Bienvenido, por favor indica a qué red de cajeros automáticos perteneces clickeando en los botones que ves debajo, o simplemente escribe 'Link' o 'Banelco' para comenzar",
      opts
    );
  });

  bot.on("text", msg => {
    let msj = msg.text.toLowerCase();
    if (msj == "link") bankNetwork = "link";
    if (msj == "banelco") bankNetwork = "banelco";

    const opts = {
      reply_markup: JSON.stringify({
        keyboard: [[{ text: "Compartir Ubicacion", request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    };
    if (msj == "link" || msj == "banelco")
      bot.sendMessage(
        msg.chat.id,
        "Por favor clickea en el botón debajo para compartir tu ubicación, la cual será usada para encontrar los cajeros más cercanos",
        opts
      );
  });

  bot.on("location", msg => {
    let currLat = msg.location.latitude;
    let currLong = msg.location.longitude;
    let closeBanks = [];
    let closeMsjs = [];

    if (bankNetwork == "link") {
      for (let i = 0; i < bancosLink.length; i++) {
        if (closeBanks.length > 2) break;
        let bankLat = bancosLink[i].lat;
        let bankLong = bancosLink[i].long;
        let toBank = distance(currLat, currLong, bankLat, bankLong, "K");

        if (toBank < 0.5 && bancosLink[i].contador > 0) {
          bancosLink[i].distancia = Math.round(toBank * 1000);
          closeBanks.push(bancosLink[i]);
        }
      }
    }

    if (bankNetwork == "banelco") {
      for (let i = 0; i < bancosBanelco.length; i++) {
        if (closeBanks.length > 2) break;
        let bankLat = bancosBanelco[i].lat;
        let bankLong = bancosBanelco[i].long;
        let toBank = distance(currLat, currLong, bankLat, bankLong, "K");
        if (toBank < 0.5 && bancosBanelco[i].contador > 0) {
          bancosBanelco[i].distancia = Math.round(toBank * 1000);
          closeBanks.push(bancosBanelco[i]);
        }
      }
    }

    closeBanks.sort(function(a, b) {
      return a.distancia - b.distancia;
    });

    for (let i = 0; i < closeBanks.length; i++) {
      closeMsjs.push(
        i + 1 +
          ": Una sucursal del " +
          closeBanks[i].banco +
          " se encuentra en " +
          closeBanks[i].ubicacion +
          ", a " +
          closeBanks[i].distancia +
          " metros de distancia de tu ubicación actual"
      );
    }

    if (closeBanks.length == 0)
      bot
        .sendMessage(
          msg.chat.id,
          "Lo sentimos, no se encontraron cajeros en un radio de 500 mts"
        )
        .then(() => {
          const opts = {
            reply_markup: JSON.stringify({
              keyboard: [["Link", "Banelco"]],
              resize_keyboard: true,
              one_time_keyboard: true
            })
          };
          bot.sendMessage(
            msg.chat.id,
            "Si deseas realizar otra búsqueda podés hacerlo clickeando en los botones que ves debajo, o escribiendo 'Link' o 'Banelco'",
            opts
          );
        });

    if (closeBanks.length == 1) {
      if (bankList) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[0].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }

      let csvFromArrayOfObjects = convertArrayToCSV(bankList);
      fs.writeFileSync("cajeros.csv", csvFromArrayOfObjects);

      bot
        .sendMessage(msg.chat.id, "Estos son los cajeros más cercanos: ")
        .then(() =>
          bot.sendPhoto(
            msg.chat.id,
            `https://maps.googleapis.com/maps/api/staticmap?center=${currLat},${currLong}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${currLat},${currLong}&markers=color:blue%7Clabel:1%7C${closeBanks[0].lat},${closeBanks[0].long}&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=AIzaSyBWjYdnlcttOCmI9GkAO43X1ID5B5_UjmM`
          )
        )
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[0]))
        .then(() => {
          const opts = {
            reply_markup: JSON.stringify({
              keyboard: [["Link", "Banelco"]],
              resize_keyboard: true,
              one_time_keyboard: true
            })
          };
          bot.sendMessage(
            msg.chat.id,
            "Si deseas realizar otra búsqueda podés hacerlo clickeando en los botones que ves debajo, o escribiendo 'Link' o 'Banelco'",
            opts
          );
        });
    }

    if (closeBanks.length == 2) {
      let counter = Math.floor(Math.random() * 10);
      if (bankList && counter < 7) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[0].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }
      if (bankList && counter > 6) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[1].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }

      let csvFromArrayOfObjects = convertArrayToCSV(bankList);
      fs.writeFileSync("cajeros.csv", csvFromArrayOfObjects);

      bot
        .sendMessage(msg.chat.id, "Estos son los cajeros más cercanos: ")
        .then(() =>
          bot.sendPhoto(
            msg.chat.id,
            `https://maps.googleapis.com/maps/api/staticmap?center=${currLat},${currLong}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${currLat},${currLong}&markers=color:blue%7Clabel:1%7C${closeBanks[0].lat},${closeBanks[0].long}&markers=color:blue%7Clabel:2%7C${closeBanks[1].lat},${closeBanks[1].long}&key=AIzaSyBWjYdnlcttOCmI9GkAO43X1ID5B5_UjmM`
          )
        )
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[0]))
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[1]))
        .then(() => {
          const opts = {
            reply_markup: JSON.stringify({
              keyboard: [["Link", "Banelco"]],
              resize_keyboard: true,
              one_time_keyboard: true
            })
          };
          bot.sendMessage(
            msg.chat.id,
            "Si deseas realizar otra búsqueda podés hacerlo clickeando en los botones que ves debajo, o escribiendo 'Link' o 'Banelco'",
            opts
          );
        });
    }

    if (closeBanks.length == 3) {
      let counter = Math.floor(Math.random() * 10);
      if (bankList && counter < 7) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[0].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }
      if (bankList && counter > 6 && counter < 9) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[1].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }
      if (bankList && counter == 9) {
        for (let i in bankList) {
          if (bankList[i].id == closeBanks[2].id) {
            bankList[i].contador -= 1;
            break;
          }
        }
      }

      let csvFromArrayOfObjects = convertArrayToCSV(bankList);
      fs.writeFileSync("cajeros.csv", csvFromArrayOfObjects);

      bot
        .sendMessage(msg.chat.id, "Estos son los cajeros más cercanos: ")
        .then(() =>
          bot.sendPhoto(
            msg.chat.id,
            `https://maps.googleapis.com/maps/api/staticmap?center=${currLat},${currLong}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${currLat},${currLong}&markers=color:blue%7Clabel:1%7C${closeBanks[0].lat},${closeBanks[0].long}&markers=color:blue%7Clabel:2%7C${closeBanks[1].lat},${closeBanks[1].long}&markers=color:blue%7Clabel:3%7C${closeBanks[2].lat},${closeBanks[2].long}&key=AIzaSyBWjYdnlcttOCmI9GkAO43X1ID5B5_UjmM`
          )
        )
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[0]))
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[1]))
        .then(() => bot.sendMessage(msg.chat.id, closeMsjs[2]))
        .then(() => {
          const opts = {
            reply_markup: JSON.stringify({
              keyboard: [["Link", "Banelco"]],
              resize_keyboard: true,
              one_time_keyboard: true
            })
          };
          bot.sendMessage(
            msg.chat.id,
            "Si deseas realizar otra búsqueda podés hacerlo clickeando en los botones que ves debajo, o escribiendo 'Link' o 'Banelco'",
            opts
          );
        });
    }
  });

  bot.on("polling_error", err => console.log(err));

  function distance(lat1, lon1, lat2, lon2, unit) {
    if (lat1 == lat2 && lon1 == lon2) {
      return 0;
    } else {
      var radlat1 = (Math.PI * lat1) / 180;
      var radlat2 = (Math.PI * lat2) / 180;
      var theta = lon1 - lon2;
      var radtheta = (Math.PI * theta) / 180;
      var dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;
      if (unit == "K") {
        dist = dist * 1.609344;
      }
      if (unit == "N") {
        dist = dist * 0.8684;
      }

      return dist;
    }
  }
};

export default botScript;
