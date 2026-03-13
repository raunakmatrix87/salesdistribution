using com.copa.salesDist as db from '../db/schema';

service SalesDist {
    @odata.draft.enabled
    entity salesDistHeader as projection on db.salesDistHeader;
    entity salesDistItem as projection on db.salesDistItem;
    entity customer as select from db.Customer {
        *,
        (Name || '/' || Street || '/' || Region || ' ' || PostalCode) as CustomerDisplay : String(600)
    };
    entity catalog as projection on db.catalog;
    action SalesOrderSimulation();
    action RefreshScreen();
}
