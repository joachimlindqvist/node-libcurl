/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  CurlOptionName,
  CurlOptionCamelCaseMap,
  CurlOptionValueType,
} from './generated/CurlOption'

import { HeaderInfo } from './parseHeaders'

import { Curl } from './Curl'

export interface CurlFnPromise {
  data: string
  headers: HeaderInfo[]
  statusCode: number
}

// This is basically http.METHODS
const methods = [
  'acl',
  'bind',
  'checkout',
  'connect',
  'copy',
  'delete',
  'get',
  'head',
  'link',
  'lock',
  'm-search',
  'merge',
  'mkactivity',
  'mkcalendar',
  'mkcol',
  'move',
  'notify',
  'options',
  'patch',
  'post',
  'propfind',
  'proppatch',
  'purge',
  'put',
  'rebind',
  'report',
  'search',
  'source',
  'subscribe',
  'trace',
  'unbind',
  'unlink',
  'unlock',
  'unsubscribe',
] as const

type HttpMethod = (typeof methods)[number]

interface CurlFnHttpMethodCall {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class.
   *
   * The `curl.<field>` being used will be the HTTP verb sent.
   */
  (url: string, options?: CurlOptionValueType): Promise<CurlFnPromise>
}

type HttpMethodCalls = { [K in HttpMethod]: CurlFnHttpMethodCall }
export interface CurlFn extends HttpMethodCalls {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class
   * It's also possible to request using a specific http verb
   *  directly by using `curl.<http-verb>(url)`
   */
  (url: string, options?: CurlOptionValueType): Promise<CurlFnPromise>
  create: () => CurlFn
}

const create = (): CurlFn => {
  function curl(
    url: string,
    options: CurlOptionValueType = {},
  ): Promise<CurlFnPromise> {
    const curlHandle = new Curl()

    curlHandle.setOpt('URL', url)

    for (const key of Object.keys(options)) {
      const keyTyped = key as keyof CurlOptionValueType

      const optionName: CurlOptionName =
        keyTyped in CurlOptionCamelCaseMap
          ? CurlOptionCamelCaseMap[
              keyTyped as keyof typeof CurlOptionCamelCaseMap
            ]
          : (keyTyped as CurlOptionName)

      // @ts-ignore @TODO Try to type this
      curlHandle.setOpt(optionName, options[key])
    }

    return new Promise((resolve, reject) => {
      try {
        curlHandle.on('end', (statusCode, data, headers) => {
          curlHandle.close()
          resolve({
            statusCode: statusCode as number,
            data: data as string,
            headers: headers as HeaderInfo[],
          })
        })

        curlHandle.on('error', (error, errorCode) => {
          curlHandle.close()
          // @ts-ignore
          error.code = errorCode
          reject(error)
        })

        curlHandle.perform()
      } catch (error) {
        curlHandle.close()
        reject(error)
      }
    })
  }

  curl.create = create

  for (const httpMethod of methods) {
    // @ts-ignore
    curl[httpMethod] =
      httpMethod === 'get'
        ? curl
        : (url: string, options: CurlOptionValueType = {}) =>
            curl(url, {
              customRequest: httpMethod,
              ...options,
            })
  }

  // @ts-ignore
  return curl
}

export const curl = create()
