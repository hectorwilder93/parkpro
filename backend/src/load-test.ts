import { performance } from 'perf_hooks';
import { promisify } from 'util';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Metrics {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: Date;
}

interface TestResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errors: string[];
}

class LoadTester {
  private baseUrl: string;
  private token: string = '';
  private results: TestResult[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(): Promise<void> {
    const start = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Admin123!' }),
      });
      const data = await response.json();
      this.token = data.access_token;
      console.log('✓ Login exitoso');
    } catch (error) {
      console.error('✗ Error en login:', error);
    }
  }

  async makeRequest(
    endpoint: string,
    method: string = 'GET',
    body?: object,
  ): Promise<Metrics> {
    const start = performance.now();
    const timestamp = new Date();
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseTime = performance.now() - start;
      
      return {
        endpoint,
        method,
        responseTime,
        status: response.status,
        timestamp,
      };
    } catch (error: any) {
      return {
        endpoint,
        method,
        responseTime: performance.now() - start,
        status: 0,
        timestamp,
      };
    }
  }

  async runLoadTest(
    testName: string,
    endpoint: string,
    method: string = 'GET',
    body?: object,
    concurrentUsers: number = 100,
    durationSeconds: number = 10,
  ): Promise<TestResult> {
    console.log(`\n🧪 Ejecutando prueba: ${testName}`);
    console.log(`   Usuarios simultáneos: ${concurrentUsers}`);
    console.log(`   Duración: ${durationSeconds}s`);

    const metrics: Metrics[] = [];
    const errors: string[] = [];
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;

    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const userPromise = (async () => {
        while (Date.now() < endTime) {
          const metric = await this.makeRequest(endpoint, method, body);
          metrics.push(metric);
          
          if (metric.status >= 400) {
            errors.push(`${metric.status} en ${endpoint}`);
          }
          
          await sleep(Math.random() * 100);
        }
      })();
      
      userPromises.push(userPromise);
    }

    await Promise.all(userPromises);

    const successfulRequests = metrics.filter(m => m.status >= 200 && m.status < 300);
    const failedRequests = metrics.filter(m => m.status >= 400);

    const responseTimes = metrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const throughput = metrics.length / durationSeconds;

    const result: TestResult = {
      testName,
      totalRequests: metrics.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      minResponseTime: Math.round(Math.min(...responseTimes) * 100) / 100,
      maxResponseTime: Math.round(Math.max(...responseTimes) * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      errors: [...new Set(errors)].slice(0, 10),
    };

    this.results.push(result);

    console.log(`\n📊 Resultados:`);
    console.log(`   Total requests: ${result.totalRequests}`);
    console.log(`   Exitosos: ${result.successfulRequests} (${((result.successfulRequests/result.totalRequests)*100).toFixed(1)}%)`);
    console.log(`   Fallidos: ${result.failedRequests}`);
    console.log(`   Tiempo promedio: ${result.avgResponseTime}ms`);
    console.log(`   Tiempo min: ${result.minResponseTime}ms`);
    console.log(`   Tiempo max: ${result.maxResponseTime}ms`);
    console.log(`   Throughput: ${result.throughput} req/s`);

    return result;
  }

  async runStressTest(): Promise<void> {
    console.log('\n🚀 INICIANDO PRUEBAS DE RENDIMIENTO\n');
    console.log('='.repeat(60));

    await this.login();

    if (!this.token) {
      console.error('No se pudo obtener token, cancelando pruebas');
      return;
    }

    const endpoints = [
      { name: 'GET /api/tickets', endpoint: '/api/tickets', method: 'GET' },
      { name: 'GET /api/spaces', endpoint: '/api/spaces', method: 'GET' },
      { name: 'GET /api/reports/resumen', endpoint: '/api/reports/resumen', method: 'GET' },
      { name: 'GET /api/users', endpoint: '/api/users', method: 'GET' },
      { name: 'POST /api/tickets/search', endpoint: '/api/tickets/search', method: 'POST', body: { placa: 'ABC123' } },
    ];

    const userLoads = [10, 50, 100, 200];

    for (const users of userLoads) {
      console.log(`\n\n📌 PRUEBA CON ${users} USUARIOS SIMULTÁNEOS`);
      console.log('-'.repeat(60));

      for (const ep of endpoints) {
        await this.runLoadTest(
          `${ep.name} (${users} users)`,
          ep.endpoint,
          ep.method,
          ep.body,
          users,
          5,
        );
        await sleep(1000);
      }
    }

    this.printSummary();
  }

  printSummary(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE PRUEBAS DE RENDIMIENTO');
    console.log('='.repeat(60));

    const avgThroughput = this.results.reduce((a, b) => a + b.throughput, 0) / this.results.length;
    const totalRequests = this.results.reduce((a, b) => a + b.totalRequests, 0);
    const totalErrors = this.results.reduce((a, b) => a + b.failedRequests, 0);
    const errorRate = (totalErrors / totalRequests * 100).toFixed(2);

    console.log(`\nMétricas Globales:`);
    console.log(`  - Total requests: ${totalRequests}`);
    console.log(`  - Error rate: ${errorRate}%`);
    console.log(`  - Throughput promedio: ${avgThroughput.toFixed(2)} req/s`);

    console.log(`\nEndpoints por rendimiento:`);
    const byEndpoint = this.results.reduce((acc, r) => {
      if (!acc[r.testName]) {
        acc[r.testName] = { times: [], errors: 0 };
      }
      acc[r.testName].times.push(r.avgResponseTime);
      acc[r.testName].errors += r.failedRequests;
      return acc;
    }, {} as Record<string, { times: number[], errors: number }>);

    Object.entries(byEndpoint)
      .sort((a, b) => a[1].times[0] - b[1].times[0])
      .forEach(([name, data]) => {
        const avg = data.times.reduce((a, b) => a + b, 0) / data.times.length;
        console.log(`  - ${name}: ${avg.toFixed(2)}ms avg, ${data.errors} errores`);
      });
  }
}

const baseUrl = process.env.API_URL || 'http://localhost:3000';
const tester = new LoadTester(baseUrl);

tester.runStressTest().catch(console.error);
