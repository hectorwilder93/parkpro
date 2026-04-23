import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from '../../database/entities';
import { TARIFAS_DEFAULT, TarifasParking } from '../../common/utils/tarifa.utils';
import { IVA_TASA_DEFAULT } from '../../common/utils/impuesto.utils';

export interface ConfiguracionSistema {
  tarifas: TarifasParking;
  ivaTasa: number;
  maxDay: number;
  openingTime: string;
  closingTime: string;
  companyName: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  descuentoEmpleadoPredeterminado: number;
}

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private configuracionRepository: Repository<Configuracion>,
  ) {}

  async getConfiguracion(): Promise<ConfiguracionSistema> {
    const config = await this.configuracionRepository.findOne({ 
      where: { clave: 'sistema' } 
    });
    
    if (config) {
      return config.valor as ConfiguracionSistema;
    }

    const defaultConfig: ConfiguracionSistema = {
      tarifas: TARIFAS_DEFAULT,
      ivaTasa: IVA_TASA_DEFAULT,
      maxDay: 40000,
      openingTime: '06:00',
      closingTime: '22:00',
      companyName: 'ParkPro SAS',
      nit: '900.123.456-7',
      address: 'Calle 123 # 45-67',
      phone: '300 123 4567',
      email: 'contacto@parkpro.com',
      descuentoEmpleadoPredeterminado: 100,
    };

    await this.configuracionRepository.save({
      clave: 'sistema',
      valor: defaultConfig,
    });

    return defaultConfig;
  }

  async getIvaTasa(): Promise<number> {
    const config = await this.getConfiguracion();
    return config.ivaTasa ?? IVA_TASA_DEFAULT;
  }

  async getTarifas(): Promise<TarifasParking> {
    const config = await this.getConfiguracion();
    return config.tarifas ?? TARIFAS_DEFAULT;
  }

  async guardarConfiguracion(config: ConfiguracionSistema): Promise<Configuracion> {
    let existing = await this.configuracionRepository.findOne({ 
      where: { clave: 'sistema' } 
    });

    if (existing) {
      existing.valor = config;
      return this.configuracionRepository.save(existing);
    } else {
      const newConfig = this.configuracionRepository.create({
        clave: 'sistema',
        valor: config,
      });
      return this.configuracionRepository.save(newConfig);
    }
  }
}
