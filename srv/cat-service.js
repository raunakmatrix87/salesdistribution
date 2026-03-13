const cds = require("@sap/cds");

function toNumber(vValue) {
  const n = Number(vValue);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getStatusCriticality(sStatus) {
  switch (sStatus) {
    case "completed":
      return 3; // Positive
    case "draft":
    default:
      return 0; // Neutral
  }
}

function buildCustomerDisplay(oCustomer) {
  if (!oCustomer) return null;
  return `${oCustomer.Name}/${oCustomer.Street}/${oCustomer.Region} ${oCustomer.PostalCode}`;
}

module.exports = cds.service.impl(function () {
  this.before(["CREATE", "UPDATE"], ["salesDistHeader", "salesDistHeader.drafts"], async (req) => {
    const oData = req.data || {};
    if (!Object.prototype.hasOwnProperty.call(oData, "CustomerNumber")) {
      return;
    }

    const sCustomerNumber = oData.CustomerNumber;
    if (!sCustomerNumber) {
      return;
    }

    const oCustomer = await SELECT.one
      .from("com.copa.salesDist.Customer")
      .columns("Name", "Street", "Region", "PostalCode", "CustomerNumber")
      .where({ CustomerNumber: sCustomerNumber });

    if (!oCustomer) {
      return;
    }

    const sDisplay = buildCustomerDisplay(oCustomer);
    req.data.CustomerName = sDisplay;
    req.data.ShipToName = sDisplay;
    req.data.ShipToLocation = oCustomer.CustomerNumber;
  });

  this.before("CREATE", "salesDistHeader.drafts", (req) => {
    const sIncoming = req.data && req.data.Status;
    const sStatus = sIncoming === "completed" ? "completed" : "draft";
    req.data.Status = sStatus;
    req.data.StatusCriticality = getStatusCriticality(sStatus);
  });

  this.before("CREATE", "salesDistHeader", (req) => {
    const sStatus = "completed";
    req.data.Status = sStatus;
    req.data.StatusCriticality = getStatusCriticality(sStatus);
  });

  this.before("UPDATE", ["salesDistHeader", "salesDistHeader.drafts"], (req) => {
    if (!req.data) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(req.data, "Status")) {
      req.data.StatusCriticality = getStatusCriticality(req.data.Status);
    }
  });

  this.before("READ", "salesDistItem", (req) => {
    const oSelect = req.query && req.query.SELECT;
    if (!oSelect || (Array.isArray(oSelect.orderBy) && oSelect.orderBy.length > 0)) {
      return;
    }

    oSelect.orderBy = [{ ref: ["ItemNumer"], sort: "asc" }];
  });

  this.before(["CREATE", "UPDATE"], ["salesDistItem", "salesDistItem.drafts"], async (req) => {
    const oData = req.data || {};
    let fQuantity = toNumber(oData.Quantity);
    let fUnitPrice = toNumber(oData.UnitPriceAmount);

    if (req.event === "UPDATE" && oData.ID && (fQuantity === null || fUnitPrice === null)) {
      const sEntityName = req.target && req.target.name;
      const oWhere = { ID: oData.ID };
      if (Object.prototype.hasOwnProperty.call(oData, "IsActiveEntity")) {
        oWhere.IsActiveEntity = oData.IsActiveEntity;
      }
      const oCurrent = await SELECT.one
        .from(sEntityName)
        .columns("Quantity", "UnitPriceAmount")
        .where(oWhere);
      if (fQuantity === null) {
        fQuantity = toNumber(oCurrent && oCurrent.Quantity);
      }
      if (fUnitPrice === null) {
        fUnitPrice = toNumber(oCurrent && oCurrent.UnitPriceAmount);
      }
    }

    if (fQuantity !== null && fUnitPrice !== null) {
      req.data.TotalValueAmount = round2(fQuantity * fUnitPrice);
    }
  });
});
