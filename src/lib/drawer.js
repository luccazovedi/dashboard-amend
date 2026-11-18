import { ref } from 'vue';

export const drawerProduct = ref(null);
export const openProduct = (produto) => (drawerProduct.value = produto);
export const closeProduct = () => (drawerProduct.value = null);
