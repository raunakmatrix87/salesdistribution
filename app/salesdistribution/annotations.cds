using SalesDist as service from '../../srv/cat-service';

annotate service.salesDistHeader with @(
    Common.SideEffects #CustomerDefaults : {
        SourceProperties : [CustomerNumber],
        TargetProperties : [CustomerName, ShipToLocation, ShipToName],
    },
    UI.FieldGroup #CustomerBlock : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Customer Number',
                Value: CustomerNumber,
            },
            {
                $Type: 'UI.DataField',
                Label: '',
                Value: CustomerName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Ship To Location',
                Value: ShipToLocation,
            },
            {
                $Type: 'UI.DataField',
                Label: '',
                Value: ShipToName,
            },
        ],
    },
    UI.FieldGroup #GeneratedGroup : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Requested Date',
                Value: RequestedDate,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Cust PO Ref Number',
                Value: CustRefNumber,
            }
        ],
    },
    UI.FieldGroup #PersonalDetails: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Requester Name',
                Value: RequesterName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Requester TelNo',
                Value: RequesterTelNo,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Requester Email',
                Value: RequesterEmail,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Sales Person Name',
                Value: SalesPersonName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Note',
                Value: Note,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Total Net Value',
                Value: TotalNetValue_code,
            },
        ],
    },
    UI.Facets                     : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'CustomerBlockFacet',
            Label : 'Customer Details',
            Target: '@UI.FieldGroup#CustomerBlock',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneratedFacet1',
            Label : 'General Information',
            Target: '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'SalesPersonDetails',
            Label : 'Personal Details',
            Target: '@UI.FieldGroup#PersonalDetails',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'ItemDetails',
            Label : 'Item Details',
            Target: 'Item/@UI.PresentationVariant#ItemDetails',
        }
    ],
    UI.LineItem                   : [
        {
            $Type: 'UI.DataField',
            Label: 'Customer Number',
            Value: CustomerNumber,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Ship To Location',
            Value: ShipToLocation,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Status',
            Value: Status,
            Criticality: StatusCriticality,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Requested Date',
            Value: RequestedDate,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Cust PO Ref Number',
            Value: CustRefNumber,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Requester Name',
            Value: RequesterName,
        }
    ],
    UI.SelectionFields            : [
        CustomerNumber,
        ShipToLocation
    ],
    UI.Identification             : [{
        $Type : 'UI.DataFieldForAction',
        Action: 'SalesDist.EntityContainer/SalesOrderSimulation',
        Label : 'Check',
    },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'SalesDist.EntityContainer/RefreshScreen',
            Label : 'Refresh',
        }, ],
);

annotate service.salesDistItem with @(
    UI.CreateHidden : true,
    Capabilities.UpdateRestrictions : {
        Updatable : true,
        NonUpdatableProperties : [
            ItemNumer,
            Material,
            IsConfigurable,
            Plant,
            UnitPriceAmount,
            TotalValueAmount,
            UnitPrice_code,
            TotalValue_code
        ],
    },
    Common.SideEffects : {
        SourceProperties : [Quantity, UnitPriceAmount],
        TargetProperties : [TotalValueAmount],
    },
    UI.PresentationVariant #ItemDetails : {
        $Type : 'UI.PresentationVariantType',
        Visualizations : ['@UI.LineItem#ItemDetails'],
        SortOrder : [{
            $Type : 'Common.SortOrderType',
            Property : ItemNumer,
            Descending : false,
        }],
    },
    UI.LineItem #ItemDetails: [
    {
    $Type: 'UI.DataField',
    Label: 'Item Number',
    Value: ItemNumer,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Material',
    Value: Material,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Configurable',
    Value: IsConfigurable,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Description',
    Value: Description,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Plant',
    Value: Plant,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Quantity',
    Value: Quantity,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Unit Price',
    Value: UnitPriceAmount,
    ![@UI.Importance]: #High,
    },
    {
    $Type: 'UI.DataField',
    Label: 'Total Value',
    Value: TotalValueAmount,
    ![@UI.Importance]: #High,
    }
]);

annotate service.salesDistItem with {
    TotalValueAmount @Common.FieldControl : #ReadOnly;
};

annotate service.salesDistHeader with {
    Item @UI.CreateHidden : true;
    StatusCriticality @UI.Hidden;

    CustomerName @Common.FieldControl : #ReadOnly;
    ShipToName @Common.FieldControl : #ReadOnly;
    CustomerNumber @Common.SideEffects : {
        TargetProperties : [CustomerName, ShipToLocation, ShipToName],
    };

    CustomerNumber @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'customer',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : CustomerNumber,
                    ValueListProperty : 'CustomerNumber',
                },
                {
                    $Type : 'Common.ValueListParameterOut',
                    LocalDataProperty : CustomerName,
                    ValueListProperty : 'CustomerDisplay',
                },
                {
                    $Type : 'Common.ValueListParameterOut',
                    LocalDataProperty : ShipToLocation,
                    ValueListProperty : 'CustomerNumber',
                },
                {
                    $Type : 'Common.ValueListParameterOut',
                    LocalDataProperty : ShipToName,
                    ValueListProperty : 'CustomerDisplay',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Catalog',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'DistributionChannel',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Division',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Street',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Region',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'PostalCode',
                }
            ],
            Label : 'Customer',
        },
    );

    ShipToLocation @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'customer',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterIn',
                    LocalDataProperty : CustomerNumber,
                    ValueListProperty : 'CustomerNumber',
                },
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : ShipToLocation,
                    ValueListProperty : 'CustomerNumber',
                },
                {
                    $Type : 'Common.ValueListParameterOut',
                    LocalDataProperty : ShipToName,
                    ValueListProperty : 'CustomerDisplay',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'CustomerDisplay',
                }
            ],
            Label : 'Ship To Location',
        },
    );
};
