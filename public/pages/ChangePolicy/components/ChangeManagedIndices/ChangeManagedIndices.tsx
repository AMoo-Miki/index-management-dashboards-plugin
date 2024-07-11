/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component } from "react";
import { EuiSpacer, EuiComboBox, EuiCompressedFormRow } from "@elastic/eui";
import { ContentPanel } from "../../../../components/ContentPanel";
import { ManagedIndexService } from "../../../../services";
import { ManagedIndexItem, State } from "../../../../../models/interfaces";
import { CoreServicesContext } from "../../../../components/core_services";

interface ChangeManagedIndicesProps {
  managedIndexService: ManagedIndexService;
  selectedManagedIndices: { label: string; value?: ManagedIndexItem }[];
  selectedStateFilters: { label: string }[];
  onChangeManagedIndices: (selectedManagedIndices: { label: string; value?: ManagedIndexItem }[]) => void;
  onChangeStateFilters: (stateFilter: { label: string }[]) => void;
  managedIndicesError: string;
  useUpdatedUX?: boolean;
}

interface ChangeManagedIndicesState {
  managedIndicesIsLoading: boolean;
  managedIndices: { label: string; value?: ManagedIndexItem }[];
  stateFilterSearchValue: string;
}

export default class ChangeManagedIndices extends Component<ChangeManagedIndicesProps, ChangeManagedIndicesState> {
  static contextType = CoreServicesContext;
  state = {
    managedIndicesIsLoading: false,
    managedIndices: [],
    stateFilterSearchValue: "",
  };

  async componentDidMount(): Promise<void> {
    await this.onManagedIndexSearchChange("");
  }

  onManagedIndexSearchChange = async (searchValue: string): Promise<void> => {
    const { managedIndexService } = this.props;
    this.setState({ managedIndicesIsLoading: true, managedIndices: [] });
    try {
      // only bring back the first 10 results descending by name
      const queryObject = { from: 0, size: 10, search: searchValue, sortDirection: "desc", sortField: "name", showDataStreams: true };
      const managedIndicesResponse = await managedIndexService.getManagedIndices(queryObject);
      if (managedIndicesResponse.ok) {
        const options = searchValue.trim() ? [{ label: `${searchValue}*` }] : [];
        const managedIndices = managedIndicesResponse.response.managedIndices.map((managedIndex: ManagedIndexItem) => ({
          label: managedIndex.index,
          value: managedIndex,
        }));
        this.setState({ managedIndices: options.concat(managedIndices) });
      } else {
        if (managedIndicesResponse.error.startsWith("[index_not_found_exception]")) {
          this.context.notifications.toasts.addDanger("You have not created a managed index yet");
        } else {
          this.context.notifications.toasts.addDanger(managedIndicesResponse.error);
        }
      }
    } catch (err) {
      this.context.notifications.toasts.addDanger(err.message);
    }

    this.setState({ managedIndicesIsLoading: false });
  };

  onStateFilterSearchChange = (searchValue: string): void => {
    this.setState({ stateFilterSearchValue: searchValue });
  };

  render() {
    const { managedIndices, managedIndicesIsLoading, stateFilterSearchValue } = this.state;
    const { selectedManagedIndices, selectedStateFilters, managedIndicesError, useUpdatedUX } = this.props;
    const uniqueStates = selectedManagedIndices.reduce(
      (accu: Set<any>, selectedManagedIndex: { label: string; value?: ManagedIndexItem }) => {
        if (!selectedManagedIndex.value) return accu;
        const policy = selectedManagedIndex.value.policy;
        if (!policy) return accu;
        policy.states.forEach((state: State) => {
          accu.add(state.name);
        });
        return accu;
      },
      new Set()
    );

    const options = stateFilterSearchValue.trim() ? [{ label: `${stateFilterSearchValue}*` }] : [];
    const stateOptions = options.concat([...uniqueStates].map((stateName: string) => ({ label: stateName })));

    return (
      <ContentPanel bodyStyles={{ padding: "initial" }} title="Choose managed indices" titleSize="s">
        <div style={{ paddingLeft: "10px" }}>
          <EuiSpacer size="m" />
          <EuiCompressedFormRow
            label="Managed indices"
            helpText="You can use * as wildcards to form index patterns."
            isInvalid={!!managedIndicesError}
            error={managedIndicesError}
          >
            <EuiComboBox
              placeholder=""
              async
              options={managedIndices}
              isInvalid={!!managedIndicesError}
              selectedOptions={selectedManagedIndices}
              isLoading={managedIndicesIsLoading}
              // @ts-ignore
              onChange={this.props.onChangeManagedIndices}
              onSearchChange={this.onManagedIndexSearchChange}
              compressed={useUpdatedUX ? true : false}
            />
          </EuiCompressedFormRow>

          <EuiCompressedFormRow label="State filters" helpText="Apply new policy only on managed indices in these states.">
            <EuiComboBox
              isDisabled={!selectedManagedIndices.length}
              placeholder="Choose state filters"
              options={stateOptions}
              selectedOptions={selectedStateFilters}
              // @ts-ignore
              onChange={this.props.onChangeStateFilters}
              onSearchChange={this.onStateFilterSearchChange}
              compressed={useUpdatedUX ? true : false}
            />
          </EuiCompressedFormRow>
        </div>
      </ContentPanel>
    );
  }
}
