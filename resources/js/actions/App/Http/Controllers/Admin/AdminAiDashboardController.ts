import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/admin/ai-intelligence',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
    const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
        action: index.url(options),
        method: 'get',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
        indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url(options),
            method: 'get',
        })
            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::index
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:25
 * @route '/admin/ai-intelligence'
 */
        indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
            action: index.url({
                        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
                            _method: 'HEAD',
                            ...(options?.query ?? options?.mergeQuery ?? {}),
                        }
                    }),
            method: 'get',
        })
    
    index.form = indexForm
/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
export const evaluate = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: evaluate.url(options),
    method: 'post',
})

evaluate.definition = {
    methods: ["post"],
    url: '/admin/ai-intelligence/evaluate',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
evaluate.url = (options?: RouteQueryOptions) => {
    return evaluate.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
evaluate.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: evaluate.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
    const evaluateForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: evaluate.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiDashboardController::evaluate
 * @see app/Http/Controllers/Admin/AdminAiDashboardController.php:66
 * @route '/admin/ai-intelligence/evaluate'
 */
        evaluateForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: evaluate.url(options),
            method: 'post',
        })
    
    evaluate.form = evaluateForm
const AdminAiDashboardController = { index, evaluate }

export default AdminAiDashboardController