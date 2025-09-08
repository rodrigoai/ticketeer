<template>
  <div id="app"> 

    <!-- Navigation -->
     <nav-bar />
    <!-- Main Content -->
    <main>
      <router-view />
    </main>
</div>
</template>


<script setup lang="ts">
import NavBar from "./components/NavBar.vue"
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
