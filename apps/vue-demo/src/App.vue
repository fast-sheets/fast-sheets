<script setup lang="ts"></script>

<template>
  <div class="container">
    <nav>
      <RouterLink to="/">Basic</RouterLink>
      <RouterLink to="/multiple">Multiple</RouterLink>
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

  @media (max-width: 768px) {
    flex-direction: column;
  }
}
nav {
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  max-width: 20vw;

  @media (max-width: 768px) {
    flex-direction: row;
    max-width: none;
    padding: 5px 10px 0;
    gap: 10px;
  }
}
.content {
  flex-grow: 1;
  height: 95dvh;
  padding-right: 100px;

  @media (max-width: 768px) {
    padding: 0 10px;
  }
}
</style>
