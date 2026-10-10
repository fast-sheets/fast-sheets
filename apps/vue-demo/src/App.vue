<script setup lang="ts"></script>

<template>
  <div class="container">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/editable">Editable</RouterLink>
      <RouterLink to="/multiple">Multiple</RouterLink>
      <RouterLink to="/search">Search</RouterLink>
    </nav>
    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
}
nav {
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
}
.content {
  flex-grow: 1;
  height: 95dvh;
  padding-right: 100px;
}
</style>
