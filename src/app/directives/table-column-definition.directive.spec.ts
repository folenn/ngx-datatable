import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableColumnDefinitionDirective } from './table-column-definition.directive';
import { configureTestSuite } from 'ng-bullet';

@Component({
  template: '<ng-template mdoTableColumnDef name="test" propertyName="test"></ng-template>'
})
class TestComponent {}

describe('TableColumnDefinitionDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  configureTestSuite(() => {
    TestBed.configureTestingModule({
      declarations: [TestComponent, TableColumnDefinitionDirective]
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });
});
