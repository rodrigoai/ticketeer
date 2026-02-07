<template>
  <div id="app"> 

    <!-- Navigation -->
    <nav-bar v-if="showNav" />
    <!-- Main Content -->
    <main>
      <router-view />
    </main>
</div>
</template>


<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import NavBar from "./components/NavBar.vue"

const route = useRoute()
const showNav = computed(() => route.name !== "PublicEventLanding")
</script>


<style scoped>
.navbar-brand i {
  margin-right: 0.5rem;
}

.nav-link.active {
  font-weight: 600;
}

main {
  min-height: calc(100vh - 56px);
  background-color: #f8f9fa;
}
</style>
