import { Component } from '@angular/core';
import { TableColumn } from './ngx-table/ngx-table.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ngx-datatable';
  dataSource = [
    { name: 'Mickey', firstName: 'Maus', bodySize: 53, birthday: new Date(1928, 11, 18) },
    { name: 'Freud', firstName: 'Sigmund', bodySize: 168, birthday: new Date(1856, 5, 6) },
    { name: 'Bach', firstName: 'Johann Sebastian', bodySize: 174, birthday: new Date(1685, 3, 31) },
    { name: 'Schmidt', firstName: 'Helmut', bodySize: 172, birthday: new Date(1918, 9, 18) }
  ];

  displayedColumns: TableColumn[] = [
    {
      name: 'Name',
      propertyName: 'name'
    }
  ];
  detailsColumns: TableColumn[] = [
    {
      name: 'body Size',
      propertyName: 'bodySize'
    }
  ];
}
