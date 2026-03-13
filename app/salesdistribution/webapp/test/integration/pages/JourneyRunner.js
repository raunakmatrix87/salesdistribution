sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"salesdistribution/test/integration/pages/salesDistHeaderList",
	"salesdistribution/test/integration/pages/salesDistHeaderObjectPage",
	"salesdistribution/test/integration/pages/salesDistItemObjectPage"
], function (JourneyRunner, salesDistHeaderList, salesDistHeaderObjectPage, salesDistItemObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('salesdistribution') + '/test/flp.html#app-preview',
        pages: {
			onThesalesDistHeaderList: salesDistHeaderList,
			onThesalesDistHeaderObjectPage: salesDistHeaderObjectPage,
			onThesalesDistItemObjectPage: salesDistItemObjectPage
        },
        async: true
    });

    return runner;
});

