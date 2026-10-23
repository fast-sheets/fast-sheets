<script setup lang="ts"></script>

<template>
  <div class="container">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/editable">Editable</RouterLink>
      <RouterLink to="/multiple">Multiple</RouterLink>
      <RouterLink to="/search">Search</RouterLink>
      <RouterLink to="/search-editable">Search & Editable</RouterLink>
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
  max-width: 20vw;

  @media (max-width: 768px) {
    padding-left: 10px;
    padding-right: 10px;
  }
}
.content {
  flex-grow: 1;
  height: 95dvh;
  padding-right: 100px;

  @media (max-width: 768px) {
    padding-right: 0;
  }
}
</style>
