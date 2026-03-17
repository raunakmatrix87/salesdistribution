sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageBox, MessageToast, Fragment, JSONModel, Filter, FilterOperator) {
    "use strict";

    var sFragmentId = "itemConfigurator";
    var oConfigDialog;
    var oConfigModel = new JSONModel({
        title: "",
        subtitle: "",
        progressText: "",
        totalSurcharge: "0.00",
        canGoPrevious: false,
        nextButtonText: "Apply",
        rows: []
    });
    var aSelectedItemContexts = [];
    var iCurrentItemIndex = 0;
    var oLastActionController;

    function getSelectedItemContexts(aSelectedContexts) {
        if (!Array.isArray(aSelectedContexts)) {
            return [];
        }
        return aSelectedContexts;
    }

    function getExtensionAPI(oController) {
        if (oController && oController.base && oController.base.getExtensionAPI) {
            return oController.base.getExtensionAPI();
        }
        if (oController && oController.getExtensionAPI) {
            return oController.getExtensionAPI();
        }
        return null;
    }

    function getDialogTable() {
        return Fragment.byId(sFragmentId, "itemConfigTable");
    }

    function calculateTotalSurcharge(aRows) {
        return aRows.reduce(function (fTotal, oRow) {
            return fTotal + Number(oRow.surcharge || 0);
        }, 0).toFixed(2);
    }

    function getCurrentItemContext() {
        return aSelectedItemContexts[iCurrentItemIndex];
    }

    function buildRows(aOptions, aExistingConfigs) {
        var mExistingByChar = {};
        aExistingConfigs.forEach(function (oConfig) {
            mExistingByChar[oConfig.CharID] = oConfig;
        });

        var mByCharacteristic = new Map();
        aOptions.forEach(function (oOption) {
            var sKey = oOption.CharID;
            if (!mByCharacteristic.has(sKey)) {
                var oExisting = mExistingByChar[sKey];
                mByCharacteristic.set(sKey, {
                    charId: oOption.CharID,
                    characteristicName: oOption.CharacteristicName,
                    selectedValueId: oExisting ? oExisting.ValueID : "",
                    surcharge: oExisting ? Number(oExisting.Surcharge || 0).toFixed(2) : "0.00",
                    options: []
                });
            }

            mByCharacteristic.get(sKey).options.push({
                valueId: oOption.ValueID,
                valueName: oOption.ValueName,
                surcharge: Number(oOption.Surcharge || 0).toFixed(2)
            });
        });

        return Array.from(mByCharacteristic.values());
    }

    function syncRowSurcharge(oRowContext, sSelectedKey) {
        var aOptions = oRowContext.getProperty("options") || [];
        var oSelectedOption = aOptions.find(function (oOption) {
            return oOption.valueId === sSelectedKey;
        });
        oRowContext.getModel().setProperty(oRowContext.getPath() + "/surcharge", oSelectedOption ? oSelectedOption.surcharge : "0.00");
        oConfigModel.setProperty("/totalSurcharge", calculateTotalSurcharge(oConfigModel.getProperty("/rows") || []));
    }

    function ensureDialog(oController) {
        if (oConfigDialog) {
            return Promise.resolve(oConfigDialog);
        }

        oLastActionController = oController;
        return Fragment.load({
            id: sFragmentId,
            name: "salesdistribution.ext.fragment.ItemConfigDialog",
            controller: {
                onConfigSelectionChange: function (oEvent) {
                    var oRowContext = oEvent.getSource().getBindingContext("itemConfig");
                    syncRowSurcharge(oRowContext, oEvent.getSource().getSelectedKey());
                },
                onConfigPrevious: function () {
                    navigateToItem(-1);
                },
                onConfigNext: function () {
                    navigateToItem(1);
                },
                onConfigCancel: function () {
                    if (oConfigDialog) {
                        oConfigDialog.close();
                    }
                }
            }
        }).then(function (oDialog) {
            oConfigDialog = oDialog;
            oConfigDialog.setModel(oConfigModel, "itemConfig");
            if (oLastActionController && oLastActionController.getView) {
                oLastActionController.getView().addDependent(oConfigDialog);
            }
            return oDialog;
        });
    }

    function requestContexts(oBinding) {
        return oBinding.requestContexts(0, 500);
    }

    function saveConfigurationForCurrentItem() {
        var oItemContext = getCurrentItemContext();
        var aRows = oConfigModel.getProperty("/rows") || [];
        var aChosenRows = aRows.filter(function (oRow) {
            return !!oRow.selectedValueId;
        });

        if (!oItemContext) {
            return Promise.reject(new Error("Item context is no longer available."));
        }

        var oModel = oItemContext.getModel();
        var sConfigPath = oItemContext.getPath() + "/Configurations";
        var oConfigBinding = oModel.bindList(sConfigPath);

        return requestContexts(oConfigBinding).then(async function (aExistingContexts) {
            var aDeletePromises = aExistingContexts.map(function (oContext) {
                return oContext.delete("$auto");
            });
            await Promise.all(aDeletePromises);

            var fSurchargeTotal = 0;
            aChosenRows.forEach(function (oRow) {
                var oSelectedOption = (oRow.options || []).find(function (oOption) {
                    return oOption.valueId === oRow.selectedValueId;
                });
                if (!oSelectedOption) {
                    return;
                }

                var fSurcharge = Number(oSelectedOption.surcharge || 0);
                fSurchargeTotal += fSurcharge;
                oConfigBinding.create({
                    CharID: oRow.charId,
                    CharacteristicName: oRow.characteristicName,
                    ValueID: oSelectedOption.valueId,
                    ValueName: oSelectedOption.valueName,
                    Surcharge: fSurcharge
                });
            });

            var fBaseUnitPrice = Number(oItemContext.getProperty("UnitPriceAmount") || 0) - Number(oItemContext.getProperty("ConfigurationSurcharge") || 0);
            var fFinalUnitPrice = Number((fBaseUnitPrice + fSurchargeTotal).toFixed(2));
            var iQuantity = Number(oItemContext.getProperty("Quantity") || 0);

            await oItemContext.setProperty("ConfigurationSurcharge", Number(fSurchargeTotal.toFixed(2)));
            await oItemContext.setProperty("IsConfigured", aChosenRows.length > 0);
            await oItemContext.setProperty("UnitPriceAmount", fFinalUnitPrice);
            await oItemContext.setProperty("TotalValueAmount", Number((iQuantity * fFinalUnitPrice).toFixed(2)));
            await oModel.submitBatch("$auto");

            await oItemContext.requestSideEffects([
                "ConfigurationSurcharge",
                "IsConfigured",
                "UnitPriceAmount",
                "TotalValueAmount"
            ]);
        });
    }

    function loadConfigurationData(oItemContext) {
        var sMaterial = oItemContext.getProperty("Material");
        var oModel = oItemContext.getModel();
        var oCatalogBinding = oModel.bindList("/catalog", null, null, [
            new Filter("ProductID", FilterOperator.EQ, sMaterial)
        ]);

        return requestContexts(oCatalogBinding).then(function (aCatalogContexts) {
            var oCatalog = aCatalogContexts.length ? aCatalogContexts[0].getObject() : null;
            if (!oCatalog) {
                throw new Error("No catalog record found for the selected material.");
            }
            if (!oCatalog.IsConfigurable) {
                throw new Error("The selected material is not configurable.");
            }

            var oVariantBinding = oModel.bindList("/variantOption", null, null, [
                new Filter("ProductID", FilterOperator.EQ, sMaterial)
            ]);
            var oExistingConfigBinding = oModel.bindList(oItemContext.getPath() + "/Configurations");

            return Promise.all([
                requestContexts(oVariantBinding),
                requestContexts(oExistingConfigBinding)
            ]).then(function (aResults) {
                var aOptions = aResults[0].map(function (oContext) {
                    return oContext.getObject();
                });
                var aExistingConfigs = aResults[1].map(function (oContext) {
                    return oContext.getObject();
                });

                return {
                    catalog: oCatalog,
                    rows: buildRows(aOptions, aExistingConfigs)
                };
            });
        });
    }

    function setDialogState(oItemContext, oData) {
        var sItemNumber = oItemContext.getProperty("ItemNumer") || "";
        var sMaterial = oItemContext.getProperty("Material") || oData.catalog.ProductID;
        var iTotal = aSelectedItemContexts.length;
        var bHasNext = iCurrentItemIndex < iTotal - 1;

        oConfigModel.setData({
            title: "Variant Configuration",
            subtitle: "Item " + sItemNumber + " | Material " + sMaterial + " | " + oData.catalog.ShortDescription,
            progressText: "Material " + (iCurrentItemIndex + 1) + " of " + iTotal,
            totalSurcharge: calculateTotalSurcharge(oData.rows),
            canGoPrevious: iCurrentItemIndex > 0,
            nextButtonText: bHasNext ? "Next" : "Apply",
            rows: oData.rows
        });
    }

    function openCurrentItem() {
        var oItemContext = getCurrentItemContext();
        if (!oItemContext) {
            MessageBox.information("No configurable items are selected.");
            return Promise.reject(new Error("No configurable items are selected."));
        }

        return loadConfigurationData(oItemContext).then(function (oData) {
            setDialogState(oItemContext, oData);
            if (!oConfigDialog.isOpen()) {
                oConfigDialog.open();
            }
        }).catch(function (oError) {
            if (iCurrentItemIndex < aSelectedItemContexts.length - 1) {
                iCurrentItemIndex += 1;
                return openCurrentItem();
            }
            throw oError;
        });
    }

    function navigateToItem(iStep) {
        saveConfigurationForCurrentItem().then(function () {
            var iNextIndex = iCurrentItemIndex + iStep;
            if (iNextIndex < 0) {
                return;
            }
            if (iNextIndex >= aSelectedItemContexts.length) {
                oConfigDialog.close();
                MessageToast.show(aSelectedItemContexts.length + " item(s) configured.");
                return;
            }

            iCurrentItemIndex = iNextIndex;
            return openCurrentItem();
        }).catch(function (oError) {
            MessageBox.error((oError && oError.message) || "Failed to apply variant configuration.");
        });
    }

    return {
        configureItem: function (oContext, aSelectedContexts) {
            var aContexts = getSelectedItemContexts(aSelectedContexts);
            if (!aContexts.length) {
                MessageBox.information("Select at least one item to configure.");
                return;
            }

            aSelectedItemContexts = aContexts;
            iCurrentItemIndex = 0;
            oLastActionController = this;

            var oExtensionAPI = getExtensionAPI(this);
            var fnOpen = function () {
                ensureDialog(oLastActionController).then(function (oDialog) {
                    return openCurrentItem();
                }).catch(function (oError) {
                    MessageBox.information((oError && oError.message) || "Variant configuration is not available for this material.");
                });
            };

            if (oExtensionAPI && oExtensionAPI.securedExecution) {
                oExtensionAPI.securedExecution(fnOpen);
                return;
            }

            fnOpen();
        }
    };
});
