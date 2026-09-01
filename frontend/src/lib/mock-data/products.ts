import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_lap_a',
    name: 'Laptop A',
    category: 'Electronics',
    price: 65000,
    stock: 12,
    compatibleProducts: ['Wireless Mouse', 'Laptop Bag', 'USB-C Dock'],
    frequentlyBoughtWith: ['Wireless Mouse'],
    agentReadableStatus: 'Available',
    description: 'High-performance ultrabook designed for professional developers and enterprise workloads.',
    specifications: {
      processor: 'Intel Core i7 13th Gen',
      ram: '16GB DDR5',
      storage: '512GB NVMe SSD',
      battery: '14.5 Hours',
      weight: '1.24 kg'
    }
  },
  {
    id: 'prod_lap_b',
    name: 'Laptop B',
    category: 'Electronics',
    price: 58000,
    stock: 8,
    compatibleProducts: ['Wireless Mouse', 'Laptop Bag'],
    frequentlyBoughtWith: ['Laptop Bag'],
    agentReadableStatus: 'Available',
    description: 'Sleek productivity laptop with long battery life and vivid IPS display.',
    specifications: {
      processor: 'AMD Ryzen 7 7700U',
      ram: '16GB LPDDR5',
      storage: '512GB SSD',
      battery: '12 Hours',
      weight: '1.35 kg'
    }
  },
  {
    id: 'prod_lap_c',
    name: 'Pro Studio Laptop C (High tier)',
    category: 'Electronics',
    price: 75000,
    stock: 5,
    compatibleProducts: ['Wireless Mouse', '4K Monitor', 'Thunderbolt Dock'],
    frequentlyBoughtWith: ['4K Monitor'],
    agentReadableStatus: 'Available',
    description: 'Workstation laptop for heavy rendering, AI model inference, and software compilation.',
    specifications: {
      processor: 'Intel Core i9 14th Gen',
      ram: '32GB DDR5',
      storage: '1TB Gen4 SSD',
      battery: '10 Hours',
      weight: '1.85 kg'
    }
  },
  {
    id: 'prod_mouse',
    name: 'Wireless Mouse',
    category: 'Accessories',
    price: 1500,
    stock: 25,
    compatibleProducts: ['Laptop A', 'Laptop B', 'Pro Studio Laptop C'],
    frequentlyBoughtWith: ['Laptop A'],
    agentReadableStatus: 'Available',
    description: 'Ergonomic dual-mode wireless mouse with quiet click triggers.',
    specifications: {
      connectivity: 'Bluetooth 5.2 + 2.4GHz Dongle',
      battery: '18 Months AA',
      dpi: '4000 DPI Sensor'
    }
  },
  {
    id: 'prod_bag',
    name: 'Laptop Bag',
    category: 'Accessories',
    price: 2000,
    stock: 15,
    compatibleProducts: ['Laptop A', 'Laptop B', 'Pro Studio Laptop C'],
    frequentlyBoughtWith: ['Laptop B'],
    agentReadableStatus: 'Available',
    description: 'Water-resistant eco-fabric laptop sleeve with padded compartmentalization.',
    specifications: {
      material: 'Recycled Cordura Nylon',
      capacity: '15.6 inch laptop',
      waterproof: 'IPX4 Splash Proof'
    }
  },
  {
    id: 'prod_hub',
    name: 'USB-C Docking Station',
    category: 'Accessories',
    price: 3500,
    stock: 18,
    compatibleProducts: ['Laptop A', 'Pro Studio Laptop C'],
    frequentlyBoughtWith: ['Laptop A'],
    agentReadableStatus: 'Available',
    description: '7-in-1 multi-port hub with 100W Power Delivery and dual HDMI 4K@60Hz.',
    specifications: {
      ports: '2x HDMI, 2x USB-A 3.2, 1x USB-C PD, SD Card Reader, 1G Ethernet',
      powerDelivery: '100W Pass-through'
    }
  }
];
