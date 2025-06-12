<template>
  <div
    v-show="showRoomsList"
    class="vac-rooms-container"
    :class="{
      'vac-rooms-container-full': isMobile,
      'vac-app-border-r': !isMobile
    }"
  >
    <slot name="rooms-header" />

  <div class="chat-controls">
  <!-- Sökfält -->
  <input
    v-model="searchQuery"
    type="text"
    placeholder="Sök efter klient..."
    @input="sendToChatContainer"
    class="chat-input"
  />

  <!-- Filterrad -->
  <div class="chat-filters">
    <label class="chat-checkbox-label">
      <input
        type="checkbox"
        v-model="showOnlyUnread"
        class="chat-checkbox"
      />
      Visa endast olästa
    </label>

    <select v-model="selectedTag" class="chat-select">
      <option value="">Alla taggar</option>
      <option
        v-for="tag in availableTags"
        :key="tag"
        :value="tag"
      >{{ tag }}</option>
    </select>
  </div>
</div>

    <loader :show="loadingRooms" type="rooms">
      <template v-for="(idx, name) in $slots" #[name]="data">
        <slot :name="name" v-bind="data" />
      </template>
    </loader>

    <div v-if="!loadingRooms && !filteredRooms.length" class="vac-rooms-empty">
      <slot name="rooms-empty">
        {{ textMessages.ROOMS_EMPTY }}
      </slot>
    </div>

    <div v-if="!loadingRooms" id="rooms-list" class="vac-room-list">
      <div
        v-for="fRoom in filteredRooms"
        :id="fRoom.roomId"
        :key="fRoom.roomId"
        class="vac-room-item"
        :class="{ 'vac-room-selected': selectedRoomId === fRoom.roomId }"
        @click="openRoom(fRoom)"
      >
        <room-content
          :current-user-id="currentUserId"
          :room="fRoom"
          :text-formatting="textFormatting"
          :link-options="linkOptions"
          :text-messages="textMessages"
          :room-actions="roomActions"
          @room-action-handler="$emit('room-action-handler', $event)"
        >
          <template v-for="(idx, name) in $slots" #[name]="data">
            <slot :name="name" v-bind="data" />
          </template>
        </room-content>
      </div>
      <transition name="vac-fade-message">
        <div v-if="showInfiniteLoader" id="infinite-loader-rooms">
          <loader :show="showLoader" :infinite="true" type="infinite-rooms">
            <template v-for="(idx, name) in $slots" #[name]="data">
              <slot :name="name" v-bind="data" />
            </template>
          </loader>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import Loader from '../../components/Loader/Loader'
import RoomsSearch from './RoomsSearch/RoomsSearch'
import RoomContent from './RoomContent/RoomContent'
import filteredItems from '../../utils/filter-items'
import { smartFilterRooms } from '../../utils/filter-helpers'
  
export default {
  name: 'RoomsList',
  components: {
    Loader,
    RoomsSearch,
    RoomContent
  },

  props: {
    currentUserId: { type: [String, Number], required: true },
    textMessages: { type: Object, required: true },
    showRoomsList: { type: Boolean, required: true },
    showSearch: { type: Boolean, required: true },
    showAddRoom: { type: Boolean, required: true },
    textFormatting: { type: Object, required: true },
    linkOptions: { type: Object, required: true },
    isMobile: { type: Boolean, required: true },
    rooms: { type: Array, required: true },
    loadingRooms: { type: Boolean, required: true },
    roomsLoaded: { type: Boolean, required: true },
    room: { type: Object, required: true },
    customSearchRoomEnabled: { type: [Boolean, String], default: false },
    customSearchRoom: { type: [Boolean, String], default: false },
    roomActions: { type: Array, required: true },
    scrollDistance: { type: Number, required: true }
  },

  emits: [
    'add-room',
    'search-room',
    'custom-search-room',
    'room-action-handler',
    'loading-more-rooms',
    'fetch-room',
    'fetch-more-rooms',
    'search-after-room'
  ],

  data() {
      return {
        searchQuery: '',
        observer: null,
        showLoader: true,
        loadingMoreRooms: false,
        selectedRoomId: '',
        showOnlyUnread: false,
        selectedTag: '',
      }
  },

  computed: {
   availableTags() {
      const tags = new Set()
    
      this.rooms.forEach(room => {
        room.users?.forEach(user => {
          // Vi vill inte ta taggar från currentUserId
          if (user._id !== this.currentUserId && Array.isArray(user.tags)) {
            user.tags.forEach(tag => tags.add(tag))
          }
        })
      })
    
      return Array.from(tags)
    },
    filteredRooms() {
      let rooms = this.rooms
    
      // 🔍 Sökning
      if (this.searchQuery) {
        rooms = smartFilterRooms(rooms, this.searchQuery, this.currentUserId)
      }
    
      // 🔕 Visa bara olästa
      if (this.showOnlyUnread) {
        rooms = rooms.filter(room => room.unreadCount > 0)
      }
    
      // 🏷 Filtrera på tagg
     if (this.selectedTag) {
        rooms = rooms.filter(room => {
          const matchingUser = room.users?.find(user =>
            user._id !== this.currentUserId &&
            Array.isArray(user.tags) &&
            user.tags.includes(this.selectedTag)
          )
          return !!matchingUser
        })
      }
    
      return rooms
    },
  showInfiniteLoader() {
    return (
      this.filteredRooms.length > 0 &&
      !this.roomsLoaded &&
      !this.searchQuery &&
      !this.showOnlyUnread &&
      !this.selectedTag
    )
  }
  },

  watch: {
     searchQuery(newVal) {
     // När man raderar hela sökningen, ladda om rooms (om de var filtrerade tidigare)
      if (newVal === '' && !this.loadingRooms && this.roomsLoaded) {
        this.$emit('search-after-room', ''); // 🔁 signal till parent att återställ
      }
    },
    rooms: {
      deep: true,
      handler(newVal, oldVal) {
        if (newVal.length !== oldVal.length || this.roomsLoaded) {
          this.loadingMoreRooms = false;
        }
      }
    },
    loadingRooms(val) {
      if (!val) {
        setTimeout(() => this.initIntersectionObserver());
      }
    },
    loadingMoreRooms(val) {
      this.$emit('loading-more-rooms', val);
    },
    roomsLoaded: {
      immediate: true,
      handler(val) {
        if (val) {
          this.loadingMoreRooms = false;
          if (!this.loadingRooms) {
            this.showLoader = false;
          }
        }
      }
    },
    room: {
      immediate: true,
      handler(val) {
        if (val && !this.isMobile) this.selectedRoomId = val.roomId;
      }
    }
  },

  methods: {
    initIntersectionObserver() {
      if (this.observer) {
        this.showLoader = true;
        this.observer.disconnect();
      }

      const loader = this.$el.querySelector('#infinite-loader-rooms');

      if (loader) {
        const options = {
          root: this.$el.querySelector('#rooms-list'),
          rootMargin: `${this.scrollDistance}px`,
          threshold: 0
        };

        this.observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            this.loadMoreRooms();
          }
        }, options);

        this.observer.observe(loader);
      }
    },
    handleCustomSearchRoom(query) {
      console.log("handleCustomSearchRoom called with query:", query);
      this.$emit('custom-search-room', query);
    },
    openRoom(room) {
      if (room.roomId === this.room.roomId && !this.isMobile) return;
      if (!this.isMobile) this.selectedRoomId = room.roomId;
      this.$emit('fetch-room', { room });
    },
    loadMoreRooms() {
      if (this.loadingMoreRooms) return;

      if (this.roomsLoaded) {
        this.loadingMoreRooms = false;
        this.showLoader = false;
        return;
      }

      this.$emit('fetch-more-rooms');
      this.loadingMoreRooms = true;
    },
    sendToChatContainer() {
      this.$emit('search-after-room', this.searchQuery);
    }
  }
}
</script>

<style>
  .chat-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chat-input {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #d1d5db; /* gray-300 */
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input:focus {
  outline: none;
  border-color: #3b82f6; /* primary-500 */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); /* ring effect */
}

.chat-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chat-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #374151; /* gray-700 */
}

.chat-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  accent-color: #3b82f6;
}

.chat-select {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
  </style>
