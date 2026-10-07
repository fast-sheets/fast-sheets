<script setup lang="ts"></script>

<template>
  <div class="container">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/editable">Editable</RouterLink>
      <RouterLink to="/multiple">Multiple</RouterLink>
      <RouterLink to="/search">Search</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.container {
  display: flex;
}

nav {
  display: flex;
  flex-direction: column;
  padding: 0 10px;
}
</style>
