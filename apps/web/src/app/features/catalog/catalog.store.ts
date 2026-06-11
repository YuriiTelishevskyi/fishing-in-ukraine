import { inject } from '@angular/core';
import { Paginated, WaterListItemDto } from '@fishing/shared';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ApiService, WatersFilter } from '../../core/api.service';

interface CatalogState {
  filter: WatersFilter;
  result: Paginated<WaterListItemDto> | null;
  loading: boolean;
}

export const CatalogStore = signalStore(
  withState<CatalogState>({ filter: { page: 1, perPage: 18 }, result: null, loading: false }),
  withMethods((store, api = inject(ApiService)) => ({
    async load(filter: WatersFilter) {
      const merged = { perPage: 18, page: 1, ...filter };
      patchState(store, { filter: merged, loading: true });
      try {
        const result = await firstValueFrom(api.waters(merged));
        patchState(store, { result, loading: false });
      } catch {
        patchState(store, { result: { items: [], total: 0, page: 1, perPage: 18 }, loading: false });
      }
    },
  })),
);
