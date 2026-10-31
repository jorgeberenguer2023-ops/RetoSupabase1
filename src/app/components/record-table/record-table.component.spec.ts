import { Community } from '../../models/record.model';
import { RecordTableComponent } from './record-table.component';

describe('CommunityTableComponent', () => {
  const communities: Community[] = [
    {
      id: 1,
      comunidad: 'Abades',
      numero: 7,
      email: 'abades@example.com',
      coste_mensual: 78.8,
      junta: '2026-10-28',
      cancelada: false,
      created_at: '2026-10-27T10:00:00Z',
    },
    {
      id: 2,
      comunidad: 'Águila',
      numero: 3,
      email: 'aguila@example.com',
      coste_mensual: 75.2,
      junta: '2026-10-29',
      cancelada: true,
      created_at: '2026-10-27T11:00:00Z',
    },
  ];

  it('filters communities by name or email without case sensitivity', () => {
    const component = new RecordTableComponent();
    component.communities = communities;
    component.searchTerm.set('AGUILA');

    expect(component.filteredCommunities.map((community) => community.id)).toEqual([2]);
  });

  it('combines search and cancellation filters', () => {
    const component = new RecordTableComponent();
    component.communities = communities;
    component.searchTerm.set('Abades');
    component.cancellationFilter.set('true');

    expect(component.filteredCommunities).toEqual([]);
  });
});
