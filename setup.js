import csv from "csv-parser";
import fs from "fs";
import { convertArrayToCSV } from "convert-array-to-csv";
import botScript from "./index";
import cron from "node-cron";
const bancosLink = [];
const bancosBanelco = [];
let bankList = [];

cron.schedule("00 35 19 * * 1-5", () => {
  console.log("Refreshing counter to renew daily extraction limit");
  resetCounter();
  console.log("Refresh completed");
});

readData();
botScript();

function readData() {
  fs.createReadStream("./cajeros.csv")
    .pipe(csv())
    .on("data", function(data) {
      bankList.push(data);
      if (data.red == "LINK") bancosLink.push(data);
      if (data.red == "BANELCO") bancosBanelco.push(data);
    })
    .on("end", function() {
      console.log("Done! Read the ATM Dataset.");
    });
}

function resetCounter() {
  bankList = [];
  fs.createReadStream("./cajeros.csv")
    .pipe(csv())
    .on("data", function(data) {
      data.contador = 1000;
      bankList.push(data);
      if (data.red == "LINK") bancosLink.push(data);
      if (data.red == "BANELCO") bancosBanelco.push(data);
    })
    .on("end", function() {
      const csvFromArrayOfObjects = convertArrayToCSV(bankList);
      fs.writeFileSync("cajeros.csv", csvFromArrayOfObjects);
    });
}

export { bancosLink, bancosBanelco, bankList };
