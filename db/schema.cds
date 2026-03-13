namespace com.copa.salesDist;

using {
    cuid,
    managed,
    Currency,
    User
} from '@sap/cds/common';

type SalesStatus : String enum {
    Draft      = 'draft';
    Completed  = 'completed';
}

entity salesDistHeader : cuid, managed {
    key ID              : UUID @(Core.Computed: true);
        CustomerNumber  : String;
        CustomerName    : String(255);
        ShipToLocation  : String;
        ShipToName      : String(600);
        Status          : SalesStatus default 'draft';
        StatusCriticality : Integer default 0;
        RequestedDate   : Date;
        CustRefNumber   : String;
        RequesterName   : String;
        RequesterTelNo  : String;
        RequesterEmail  : String;
        SalesPersonName : String;
        Note            : String;
        TotalNetValue   : Currency;

        Item            : Composition of many salesDistItem // This defines a one-to-many relationship where a salesDistHeader can have multiple associated salesDistItem entities.
                              on Item.parent = $self;
}

entity salesDistItem : cuid {
    key ID              : UUID @(Core.Computed: true);
        ItemNumer       : String;
        Material        : String;
        Description     : String;
        Plant           : String;
        Quantity        : Integer;
        UnitPriceAmount : Decimal(15,2) @Measures.ISOCurrency: UnitPrice_code;
        UnitPrice       : Currency;
        TotalValueAmount : Decimal(15,2) @Measures.ISOCurrency: TotalValue_code;
        TotalValue      : Currency;
        parent : Association to salesDistHeader;
}


entity catalog : cuid, managed {
    key ID                 : UUID @(Core.Computed: true);
        ProductID          : String(40);
        ShortDescription   : String(255);
        LongDescription    : String(2000);
        Category           : String(100);
        Supplier           : String(100);
        OrderUnit          : String(10);
        Price              : Decimal(15,2);
        CurrencyCode       : Currency; 
        PriceBaseQuantity  : Decimal(13,3);
        PriceBaseUoM       : String(10);
        MinimumQuantity    : Decimal(13,3);
        MinimumQuantityUoM : String(10);
        QuoteFlag          : Boolean;
        DocOverrideFlag    : Boolean;
}

entity Customer : cuid, managed {
    key CustomerNumber : String(10); 
        Catalog        : String(50);
        DistributionChannel : String(10);
        Division       : String(10); 
        Name           : String(255);
        Street         : String(255);
        Region         : String(10);
        PostalCode     : String(20);
}
