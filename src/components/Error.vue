<template>
  <div v-if="visible && msg" class="fixed top-20 right-4 z-50 animate-slide-in-right">
    <div class="flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-100 text-red-800 shadow-lg max-w-sm">
      <div class="flex-shrink-0 mt-0.5">
        <i class="fas fa-exclamation-circle text-red-500"></i>
      </div>
      <div class="flex-1 text-sm font-medium">
        {{ msg }}
      </div>
      <button 
        @click="dismiss"
        class="flex-shrink-0 text-red-400 hover:text-red-600 transition -mr-1 -mt-1 p-1 rounded-full hover:bg-red-100"
        aria-label="Close"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { computed, ref, watch } from 'vue';

const auth0 = useAuth0();
const isDismissed = ref(false);

const msg = computed(() => auth0.error.value);

const visible = computed(() => !!msg.value && !isDismissed.value);

// Watch for NEW errors to reset dismissal state
watch(msg, (newVal) => {
  if (newVal) {
    isDismissed.value = false;
  }
});

const dismiss = () => {
  isDismissed.value = true;
};
</script>

<style scoped>
.animate-slide-in-right {
  animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>

